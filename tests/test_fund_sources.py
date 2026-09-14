import unittest
from unittest.mock import patch

import pandas as pd

from backend.funds.identifiers import normalize_isin, normalize_yahoo_symbol
from backend.funds.cli import build_response, normalize_entries
from backend.funds.cache import _make_cache_key
from backend.funds.service import get_fund_snapshot, MorningstarScraperError
from backend.funds.yahoo_client import fetch_yahoo_history, YahooFinanceError


ISIN = "IE00B4L5Y983"


class FundSourcesTest(unittest.TestCase):
    def test_identifiers_are_not_extracted_from_urls_or_malformed_text(self):
        self.assertEqual(normalize_isin(" ie00b4l5y983 "), ISIN)
        for invalid in ["IE00B4L5Y984", "IE00-B4L5Y983", "0P0001CLDK", "F00000ABC",
                        "https://example.com/IE00B4L5Y983", "VWCE.DE", None]:
            with self.subTest(invalid=invalid):
                self.assertEqual(normalize_isin(invalid), "")
        self.assertEqual(normalize_yahoo_symbol(" 0p0001cldk.f "), "0P0001CLDK.F")
        self.assertEqual(normalize_yahoo_symbol("https://finance.yahoo.com/quote/VWCE.DE"), "")

    def test_invalid_entries_are_reported_not_silently_dropped(self):
        with self.assertRaises(ValueError):
            normalize_entries({"entries": [{"isin": ISIN}, {"isin": "bad/symbol"}]})
        with self.assertRaises(ValueError):
            normalize_entries({"entries": [{"isin": ISIN, "yahooSymbol": "https://yahoo.com"}]})
        entry = normalize_entries({"entries": [{"isin": ISIN, "yahooSymbol": "vwce.de"}]})[0]
        self.assertEqual(entry["yahooSymbol"], "VWCE.DE")
        symbol_entry = normalize_entries({"entries": [{"isin": "aapl", "currency": "AUTO"}]})[0]
        self.assertEqual(symbol_entry, {"isin": "AAPL", "currency": "AUTO", "yahooSymbol": "AAPL"})
        with self.assertRaises(ValueError):
            normalize_entries({"entries": [{"isin": "IE00B4L5Y984"}]})
        with self.assertRaisesRegex(ValueError, "currency"):
            normalize_entries({"entries": [{"isin": ISIN, "currency": "AUTO"}]})
        with self.assertRaisesRegex(ValueError, "currency"):
            normalize_entries({"entries": [{"isin": "AAPL", "currency": "BTC"}]})

    def test_request_options_are_validated(self):
        with self.assertRaisesRegex(ValueError, "date"):
            build_response({"entries": [{"isin": ISIN}], "startDate": "not-a-date"})
        with self.assertRaisesRegex(ValueError, "future"):
            build_response({"entries": [{"isin": ISIN}], "startDate": "2999-01-01"})
        with self.assertRaisesRegex(ValueError, "frequency"):
            build_response({"entries": [{"isin": ISIN}], "frequency": "hourly"})

    @patch("backend.funds.service.fetch_yahoo_history")
    @patch("backend.funds.service.resolve_history")
    def test_morningstar_has_priority(self, morningstar, yahoo):
        morningstar.return_value = ("Fund", pd.DataFrame({"date": [pd.Timestamp("2025-01-02")], "price": [10]}), {"provider": "morningstar"})
        snapshot = get_fund_snapshot(ISIN, yahoo_symbol="VWCE.DE")
        self.assertEqual(snapshot.metadata["provider"], "morningstar")
        yahoo.assert_not_called()

    @patch("backend.funds.service.fetch_yahoo_history")
    @patch("backend.funds.service.resolve_history")
    def test_yahoo_only_after_morningstar_failure(self, morningstar, yahoo):
        morningstar.side_effect = MorningstarScraperError("Unavailable")
        yahoo.return_value = ("Fund", pd.DataFrame({"date": [pd.Timestamp("2025-01-02")], "price": [10]}), {"provider": "yahoo"})
        snapshot = get_fund_snapshot(ISIN, yahoo_symbol="VWCE.DE")
        self.assertEqual(snapshot.isin, ISIN)
        self.assertEqual(snapshot.metadata["provider"], "yahoo")
        yahoo.assert_called_once()
        yahoo.reset_mock()
        with self.assertRaisesRegex(MorningstarScraperError, "Morningstar"):
            get_fund_snapshot(ISIN, language="es")
        yahoo.assert_not_called()

    @patch("backend.funds.service.fetch_yahoo_history")
    @patch("backend.funds.service.resolve_history")
    def test_yahoo_symbol_is_loaded_directly(self, morningstar, yahoo):
        yahoo.return_value = (
            "Apple Inc.",
            pd.DataFrame({"date": [pd.Timestamp("2025-01-02")], "price": [243]}),
            {"provider": "yahoo", "resolved_currency": "USD"},
        )
        snapshot = get_fund_snapshot("AAPL", currency="AUTO")
        self.assertEqual(snapshot.isin, "AAPL")
        self.assertEqual(snapshot.name, "Apple Inc.")
        morningstar.assert_not_called()
        yahoo.assert_called_once_with(
            "AAPL", start_date="2000-01-01", currency="AUTO",
            frequency="daily", language="en",
        )

    def test_cache_separates_fallback_symbols(self):
        args = dict(isin=ISIN, currency="EUR", start_date="2000-01-01", frequency="daily", language="es")
        self.assertNotEqual(_make_cache_key(**args), _make_cache_key(**args, yahoo_symbol="VWCE.DE"))
        self.assertNotEqual(_make_cache_key(**args, yahoo_symbol="VWCE.DE"), _make_cache_key(**args, yahoo_symbol="OTHER.DE"))

    @patch("backend.funds.yahoo_client._session")
    def test_yahoo_checks_type_currency_and_history(self, session):
        result = {
            "meta": {"instrumentType": "ETF", "currency": "EUR", "exchangeTimezoneName": "Europe/Berlin", "longName": "Test fund"},
            "timestamp": [1735804800, 1735891200, 1736150400],
            "indicators": {"quote": [{"close": [100, None, 102]}]},
        }
        session.return_value.get.return_value.json.return_value = {"chart": {"error": None, "result": [result]}}
        args = dict(start_date="2025-01-01", currency="EUR", frequency="daily", language="es")
        name, history, metadata = fetch_yahoo_history("VWCE.DE", **args)
        self.assertEqual(history.price.tolist(), [100, 102])
        self.assertEqual(metadata["provider"], "yahoo")
        self.assertEqual(name, "Test fund")
        result["meta"]["currency"] = "USD"
        with self.assertRaisesRegex(YahooFinanceError, "Selecciona esa divisa"):
            fetch_yahoo_history("VWCE.DE", **args)
        result["meta"]["instrumentType"] = "EQUITY"
        result["meta"]["currency"] = "EUR"
        name, history, metadata = fetch_yahoo_history("AAPL", **args)
        self.assertEqual(metadata["resolved_quote_type"], "EQUITY")
        session.return_value.get.return_value.json.return_value = {"chart": {"error": {"description": "Not found"}, "result": None}}
        with self.assertRaises(YahooFinanceError):
            fetch_yahoo_history("UNKNOWN", **args)


if __name__ == "__main__":
    unittest.main()
