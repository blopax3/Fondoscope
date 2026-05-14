from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from tempfile import gettempdir
from typing import Any

CACHE_TTL_SECONDS = 6 * 60 * 60
CACHE_MAX_ENTRIES = 300
CACHE_FILE_PATH = Path(gettempdir()) / "fondoscope-morningstar-cache-v1.json"


def _make_cache_key(*, isin: str, currency: str, start_date: str, frequency: str, language: str) -> str:
    raw = "|".join([isin, currency, start_date, frequency, language])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _read_cache_file() -> dict[str, Any]:
    if not CACHE_FILE_PATH.exists():
        return {"entries": {}}

    try:
        payload = json.loads(CACHE_FILE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"entries": {}}

    entries = payload.get("entries")
    if not isinstance(entries, dict):
        return {"entries": {}}

    return {"entries": entries}


def _write_cache_file(payload: dict[str, Any]) -> None:
    try:
        CACHE_FILE_PATH.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


def _prune_entries(entries: dict[str, Any], now: float) -> dict[str, Any]:
    valid_items: list[tuple[str, Any]] = []
    for key, value in entries.items():
        if not isinstance(value, dict):
            continue

        expires_at = value.get("expires_at")
        if not isinstance(expires_at, (int, float)) or expires_at <= now:
            continue

        valid_items.append((key, value))

    valid_items.sort(key=lambda item: float(item[1].get("updated_at", 0)), reverse=True)
    return dict(valid_items[:CACHE_MAX_ENTRIES])


def get_cached_fund_response(
    *,
    isin: str,
    currency: str,
    start_date: str,
    frequency: str,
    language: str,
) -> dict[str, Any] | None:
    key = _make_cache_key(
        isin=isin,
        currency=currency,
        start_date=start_date,
        frequency=frequency,
        language=language,
    )
    now = time.time()
    cache = _read_cache_file()
    entries = cache["entries"]
    entry = entries.get(key)

    if not isinstance(entry, dict):
        return None

    expires_at = entry.get("expires_at")
    payload = entry.get("payload")
    if not isinstance(expires_at, (int, float)) or expires_at <= now or not isinstance(payload, dict):
        return None

    return payload


def set_cached_fund_response(
    *,
    isin: str,
    currency: str,
    start_date: str,
    frequency: str,
    language: str,
    payload: dict[str, Any],
) -> None:
    key = _make_cache_key(
        isin=isin,
        currency=currency,
        start_date=start_date,
        frequency=frequency,
        language=language,
    )

    now = time.time()
    cache = _read_cache_file()
    entries = _prune_entries(cache["entries"], now)
    entries[key] = {
        "updated_at": now,
        "expires_at": now + CACHE_TTL_SECONDS,
        "payload": payload,
    }
    cache["entries"] = _prune_entries(entries, now)
    _write_cache_file(cache)
