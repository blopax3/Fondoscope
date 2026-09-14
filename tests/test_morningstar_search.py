import unittest
from unittest.mock import patch

import pandas as pd

from backend.funds.morningstar_client import (
    MorningstarScraperError, _parse_security_search_response, resolve_history, search_candidates,
)
from backend.funds.models import SearchCandidate
from backend.funds.service import get_fund_snapshot


ISIN = "ES0112611001"
ROW = {"SecId": "F00000WI0D", "Name": "Azvalor Internacional FI", "ISIN": ISIN, "Currency": "EUR"}


class MorningstarSearchTest(unittest.TestCase):
    @patch("backend.funds.morningstar_client._session")
    def test_search_resolves_azvalor_using_exact_isin_filter(self, session):
        session.return_value.get.return_value.json.return_value = {"rows": [ROW], "total": 1}
        candidates = search_candidates(ISIN, language="es")
        self.assertEqual(candidates[0].name, "Azvalor Internacional FI")
        self.assertEqual(candidates[0].currency, "EUR")
        self.assertEqual(candidates[0].candidate_ids, [("i", "F00000WI0D")])
        args, kwargs = session.return_value.get.call_args
        self.assertTrue(args[0].endswith("/security/screener"))
        self.assertEqual(kwargs["params"]["filters"], f"ISIN:EQ:{ISIN}")
        self.assertEqual(kwargs["params"]["securityDataPoints"], "SecId,Name,ISIN,Currency")
        session.return_value.post.assert_not_called()

    def test_wrong_share_classes_and_duplicate_results_are_ignored(self):
        payload = {"rows": [ROW, ROW, {**ROW, "ISIN": "IE00B4L5Y983"}, None, {"ISIN": ISIN}]}
        self.assertEqual(len(_parse_security_search_response(payload, ISIN)), 1)

    @patch("backend.funds.morningstar_client.fetch_history_by_id")
    @patch("backend.funds.morningstar_client.search_candidates")
    def test_history_uses_native_share_class_currency(self, search, fetch):
        search.return_value = [SearchCandidate("USD fund", {"i": "F00000WI0D"}, "USD")]
        fetch.return_value = pd.DataFrame({"date": [pd.Timestamp("2026-01-02")], "price": [100]})

        _, _, metadata = resolve_history(ISIN, currency="AUTO", frequency="daily", start_date="2000-01-01")

        self.assertEqual(fetch.call_args.kwargs["currency"], "USD")
        self.assertEqual(metadata["resolved_currency"], "USD")

    @patch("backend.funds.morningstar_client._session")
    def test_empty_results_are_distinct_from_invalid_server_responses(self, session):
        response = session.return_value.get.return_value
        response.json.return_value = {"rows": []}
        with self.assertRaisesRegex(MorningstarScraperError, "ninguna coincidencia exacta"):
            search_candidates(ISIN, language="es")
        response.json.side_effect = ValueError("Empty response")
        with self.assertRaisesRegex(MorningstarScraperError, "No se pudo consultar el buscador"):
            search_candidates(ISIN, language="es")
        with self.assertRaises(ValueError):
            _parse_security_search_response({"error": "unavailable"}, ISIN)

    @patch("backend.funds.service.resolve_history")
    def test_user_error_preserves_the_search_failure(self, resolve):
        resolve.side_effect = MorningstarScraperError("No se pudo consultar el buscador")
        with self.assertRaisesRegex(MorningstarScraperError, "No se pudo consultar el buscador") as caught:
            get_fund_snapshot(ISIN, language="es")
        self.assertNotIn("no dispone de histórico", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
