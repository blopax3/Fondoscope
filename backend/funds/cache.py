from __future__ import annotations

from contextlib import closing, contextmanager
import hashlib
import json
from pathlib import Path
import sqlite3
from tempfile import gettempdir
import time
from typing import Any

CACHE_TTL_SECONDS = 6 * 60 * 60
CACHE_MAX_ENTRIES = 300
CACHE_FILE_PATH = Path(gettempdir()) / "fondoscope-funds-cache-v6.sqlite3"


def _make_cache_key(*, isin: str, currency: str, start_date: str, frequency: str, language: str, yahoo_symbol: str = "", morningstar_id: str = "") -> str:
    raw = "|".join([isin, currency, start_date, frequency, language, yahoo_symbol, morningstar_id])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@contextmanager
def _connection():
    with closing(sqlite3.connect(CACHE_FILE_PATH, timeout=1)) as connection:
        with connection:
            connection.execute("CREATE TABLE IF NOT EXISTS funds (key TEXT PRIMARY KEY, expires_at REAL, updated_at REAL, payload TEXT)")
            yield connection


def get_cached_fund_response(
    *, isin: str, currency: str, start_date: str, frequency: str, language: str,
    yahoo_symbol: str = "", morningstar_id: str = "",
) -> dict[str, Any] | None:
    key = _make_cache_key(isin=isin, currency=currency, start_date=start_date, frequency=frequency,
                          language=language, yahoo_symbol=yahoo_symbol, morningstar_id=morningstar_id)
    try:
        with _connection() as connection:
            row = connection.execute("SELECT payload FROM funds WHERE key = ? AND expires_at > ?", (key, time.time())).fetchone()
        payload = json.loads(row[0]) if row else None
        return payload if isinstance(payload, dict) else None
    except (sqlite3.Error, OSError, ValueError):
        return None


def set_cached_fund_response(
    *, isin: str, currency: str, start_date: str, frequency: str, language: str,
    yahoo_symbol: str = "", morningstar_id: str = "", payload: dict[str, Any],
) -> None:
    key = _make_cache_key(isin=isin, currency=currency, start_date=start_date, frequency=frequency,
                          language=language, yahoo_symbol=yahoo_symbol, morningstar_id=morningstar_id)
    now = time.time()
    try:
        with _connection() as connection:
            connection.execute("INSERT OR REPLACE INTO funds VALUES (?, ?, ?, ?)",
                               (key, now + CACHE_TTL_SECONDS, now, json.dumps(payload, ensure_ascii=False)))
            connection.execute("DELETE FROM funds WHERE expires_at <= ?", (now,))
            connection.execute("DELETE FROM funds WHERE key NOT IN (SELECT key FROM funds ORDER BY updated_at DESC LIMIT ?)", (CACHE_MAX_ENTRIES,))
    except (sqlite3.Error, OSError):
        # A cache failure must not discard successfully fetched history.
        pass
