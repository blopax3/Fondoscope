import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Event
from time import monotonic
import unittest
from unittest.mock import patch

from backend.funds import cache
from backend.funds.cli import build_response
from backend.funds.config import request_timeout


OPTIONS = dict(currency="AUTO", start_date="2000-01-01", frequency="daily", language="en")


class CacheAndTimeoutTest(unittest.TestCase):
    def test_processes_preserve_each_others_cache_entries(self):
        worker = """
import sys
from pathlib import Path
from backend.funds import cache
cache.CACHE_FILE_PATH = Path(sys.argv[1])
cache.set_cached_fund_response(isin=sys.argv[2], currency='AUTO', start_date='2000-01-01', frequency='daily', language='en', payload={'isin': sys.argv[2]})
"""
        with TemporaryDirectory() as temp, patch.object(cache, "CACHE_FILE_PATH", Path(temp) / "cache.sqlite3"):
            symbols = ["AAPL", "MSFT", "GOOG", "BP.L"]
            processes = [subprocess.Popen([sys.executable, "-c", worker, str(cache.CACHE_FILE_PATH), symbol]) for symbol in symbols]
            for process in processes:
                self.assertEqual(process.wait(timeout=10), 0)
            for symbol in symbols:
                self.assertEqual(cache.get_cached_fund_response(isin=symbol, **OPTIONS), {"isin": symbol})

    def test_cache_expiration_eviction_and_unavailable_storage(self):
        with TemporaryDirectory() as temp, patch.object(cache, "CACHE_FILE_PATH", Path(temp) / "cache.sqlite3"):
            with patch.object(cache, "CACHE_MAX_ENTRIES", 1):
                cache.set_cached_fund_response(isin="AAPL", payload={"isin": "AAPL"}, **OPTIONS)
                cache.set_cached_fund_response(isin="MSFT", payload={"isin": "MSFT"}, **OPTIONS)
                self.assertIsNone(cache.get_cached_fund_response(isin="AAPL", **OPTIONS))
            with patch("backend.funds.cache.time.time", return_value=10**12):
                self.assertIsNone(cache.get_cached_fund_response(isin="MSFT", **OPTIONS))
            with patch.object(cache, "CACHE_FILE_PATH", Path(temp)):
                cache.set_cached_fund_response(isin="AAPL", payload={}, **OPTIONS)
                self.assertIsNone(cache.get_cached_fund_response(isin="AAPL", **OPTIONS))

    def test_deadline_returns_completed_funds_and_errors_for_pending_funds(self):
        release = Event()

        def load(entry, **kwargs):
            if entry["isin"] == "MSFT":
                release.wait(timeout=2)
            return {"fund": {"isin": entry["isin"]}, "error": None}

        try:
            with patch("backend.funds.cli.HISTORY_BUDGET_SECONDS", 0.1), patch("backend.funds.cli.load_fund_entry", side_effect=load):
                started = monotonic()
                result = build_response({"entries": [{"isin": "AAPL"}, {"isin": "MSFT"}], "language": "es"})
                self.assertLess(monotonic() - started, 1)
                self.assertEqual(result["funds"], [{"isin": "AAPL"}])
                self.assertEqual(result["errors"][0]["isin"], "MSFT")
                self.assertIn("tiempo de espera", result["errors"][0]["error"])
        finally:
            release.set()

    def test_exhausted_deadline_does_not_start_another_provider_request(self):
        with self.assertRaises(TimeoutError):
            request_timeout(monotonic() - 1)
        self.assertLessEqual(request_timeout(monotonic() + 0.5), 0.5)

    def test_cli_flushes_partial_response_without_waiting_for_pending_threads(self):
        worker = """
import json, sys, time
from pathlib import Path
import pandas as pd
from backend.funds import cache, config, service
from backend.funds.models import FundSnapshot
cache.CACHE_FILE_PATH = Path(sys.argv[1])
config.HISTORY_BUDGET_SECONDS = 0.1
def fetch(identifier, **kwargs):
    if identifier == 'MSFT':
        time.sleep(5)
    return FundSnapshot(identifier, identifier, pd.DataFrame({'date': [pd.Timestamp('2026-01-02')], 'price': [100]}), {'resolved_currency': 'USD'})
service.get_fund_snapshot = fetch
sys.argv = ['cli', json.dumps({'entries': [{'isin': 'AAPL'}, {'isin': 'MSFT'}]})]
exec(compile(Path('backend/funds/cli.py').read_text(), 'cli.py', 'exec'), {'__name__': '__main__', '__package__': 'backend.funds'})
"""
        with TemporaryDirectory() as temp:
            result = subprocess.run([sys.executable, "-c", worker, str(Path(temp) / "cache.sqlite3")], capture_output=True, text=True, timeout=3, check=True)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["funds"][0]["isin"], "AAPL")
        self.assertEqual(payload["errors"][0]["isin"], "MSFT")


if __name__ == "__main__":
    unittest.main()
