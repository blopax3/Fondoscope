import unittest
from unittest.mock import patch

from backend.funds.morningstar_client import (
    MorningstarScraperError, _parse_security_search_response, search_candidates,
)
from backend.funds.service import get_fund_snapshot


ISIN = "ES0112611001"
ROW = {"SecId": "F00000WI0D", "Name": "Azvalor Internacional FI", "ISIN": ISIN}


class MorningstarSearchTest(unittest.TestCase):
    @patch("backend.funds.morningstar_client._session")
    def test_search_resolves_azvalor_using_exact_isin_filter(self, session):
        session.return_value.get.return_value.json.return_value = {"rows": [ROW], "total": 1}
        candidates = search_candidates(ISIN, language="es")
        self.assertEqual(candidates[0].name, "Azvalor Internacional FI")
        self.assertEqual(candidates[0].candidate_ids, [("i", "F00000WI0D")])
        args, kwargs = session.return_value.get.call_args
        self.assertTrue(args[0].endswith("/security/screener"))
        self.assertEqual(kwargs["params"]["filters"], f"ISIN:EQ:{ISIN}")
        self.assertEqual(kwargs["params"]["securityDataPoints"], "SecId,Name,ISIN")
        session.return_value.post.assert_not_called()

    def test_wrong_share_classes_and_duplicate_results_are_ignored(self):
        payload = {"rows": [ROW, ROW, {**ROW, "ISIN": "IE00B4L5Y983"}, None, {"ISIN": ISIN}]}
        self.assertEqual(len(_parse_security_search_response(payload, ISIN)), 1)

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
