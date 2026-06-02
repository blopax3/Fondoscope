from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import re
import sys
from typing import Any

from .cache import get_cached_fund_response, set_cached_fund_response
from .morningstar_client import normalize_isin, normalize_language
from .service import MorningstarScraperError, get_fund_snapshot, serialize_snapshot

ISIN_PATTERN = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$")
DEFAULT_MAX_WORKERS = 4


def normalize_identifier(value: object) -> str:
    normalized = normalize_isin(str(value or ""))
    if ISIN_PATTERN.fullmatch(normalized):
        return normalized
    if normalized and normalized.startswith(("0P", "F0")):
        return normalized
    return ""


def normalize_entries(payload: dict[str, object]) -> list[dict[str, str]]:
    entries = payload.get("entries", [])
    if isinstance(entries, list) and entries:
        normalized_entries: list[dict[str, str]] = []
        seen: set[str] = set()

        for entry in entries:
            if not isinstance(entry, dict):
                continue

            isin = normalize_identifier(entry.get("isin", ""))
            if not isin or isin in seen:
                continue

            seen.add(isin)
            currency_value = entry.get("currency", "EUR")
            currency = currency_value.strip().upper() if isinstance(currency_value, str) else "EUR"
            currency = currency or "EUR"
            normalized_entries.append({"isin": isin, "currency": currency})

        return normalized_entries

    isins = payload.get("isins", [])
    if not isinstance(isins, list):
        return []

    global_currency_value = payload.get("currency", "EUR")
    global_currency = global_currency_value.strip().upper() if isinstance(global_currency_value, str) else "EUR"
    global_currency = global_currency or "EUR"
    normalized_entries = []
    seen: set[str] = set()

    for isin_value in isins:
        isin = normalize_identifier(isin_value)
        if not isin or isin in seen:
            continue

        seen.add(isin)
        normalized_entries.append({"isin": isin, "currency": global_currency})

    return normalized_entries


def _resolve_max_workers(entry_count: int) -> int:
    raw_value = os.environ.get("FONDOSCOPE_MAX_WORKERS", str(DEFAULT_MAX_WORKERS))
    try:
        configured_workers = int(raw_value)
    except ValueError:
        configured_workers = DEFAULT_MAX_WORKERS

    return max(1, min(entry_count, configured_workers))


def load_fund_entry(
    entry: dict[str, str],
    *,
    start_date: str,
    frequency: str,
    language: str,
) -> dict[str, Any]:
    isin = entry.get("isin", "")
    currency = entry.get("currency", "EUR")
    if not isin:
        return {"fund": None, "error": None}

    try:
        cached_result = get_cached_fund_response(
            isin=isin,
            currency=currency,
            start_date=start_date,
            frequency=frequency,
            language=language,
        )
        if cached_result is not None:
            return {"fund": cached_result, "error": None}

        snapshot = get_fund_snapshot(
            isin,
            start_date=start_date,
            currency=currency,
            frequency=frequency,
            language=language,
        )
        result = serialize_snapshot(snapshot)
        result["currency"] = currency
        set_cached_fund_response(
            isin=isin,
            currency=currency,
            start_date=start_date,
            frequency=frequency,
            language=language,
            payload=result,
        )
        return {"fund": result, "error": None}
    except MorningstarScraperError as error:
        return {"fund": None, "error": {"isin": isin, "error": str(error)}}
    except Exception as error:
        return {"fund": None, "error": {"isin": isin, "error": str(error)}}


def build_response(payload: dict[str, object]) -> dict[str, object]:
    language = normalize_language(str(payload.get("language", "en")))
    start_date = payload.get("startDate", "2000-01-01")
    start_date = start_date if isinstance(start_date, str) else "2000-01-01"
    frequency = payload.get("frequency", "daily")
    frequency = frequency if isinstance(frequency, str) else "daily"
    entries = normalize_entries(payload)

    if not entries:
        raise ValueError(
            "Debes indicar al menos un ISIN o ID de Morningstar válido."
            if language == "es"
            else "You must provide at least one valid ISIN or Morningstar ID."
        )

    ordered_results: list[dict[str, Any] | None] = [None] * len(entries)
    max_workers = _resolve_max_workers(len(entries))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(
                load_fund_entry,
                entry,
                start_date=start_date,
                frequency=frequency,
                language=language,
            ): index
            for index, entry in enumerate(entries)
        }

        for future in as_completed(futures):
            ordered_results[futures[future]] = future.result()

    funds = [
        result["fund"]
        for result in ordered_results
        if result and result.get("fund") is not None
    ]
    errors = [
        result["error"]
        for result in ordered_results
        if result and result.get("error") is not None
    ]

    return {"funds": funds, "errors": errors}


def main() -> int:
    raw_payload = sys.argv[1] if len(sys.argv) > 1 else "{}"
    payload = json.loads(raw_payload)
    print(json.dumps(build_response(payload), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
