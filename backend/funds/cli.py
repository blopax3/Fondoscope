from __future__ import annotations

import json
import sys

from .morningstar_client import normalize_language
from .service import MorningstarScraperError, get_fund_snapshot, serialize_snapshot


def normalize_entries(payload: dict[str, object]) -> list[dict[str, str]]:
    entries = payload.get("entries", [])
    if isinstance(entries, list) and entries:
        normalized_entries: list[dict[str, str]] = []
        seen: set[str] = set()

        for entry in entries:
            if not isinstance(entry, dict):
                continue

            isin = str(entry.get("isin", "")).strip().upper()
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
        isin = str(isin_value).strip().upper()
        if not isin or isin in seen:
            continue

        seen.add(isin)
        normalized_entries.append({"isin": isin, "currency": global_currency})

    return normalized_entries


def build_response(payload: dict[str, object]) -> dict[str, object]:
    language = normalize_language(str(payload.get("language", "en")))
    start_date = payload.get("startDate", "2000-01-01")
    start_date = start_date if isinstance(start_date, str) else "2000-01-01"
    frequency = payload.get("frequency", "daily")
    frequency = frequency if isinstance(frequency, str) else "daily"
    entries = normalize_entries(payload)

    if not entries:
        raise ValueError(
            "Debes indicar al menos un ISIN."
            if language == "es"
            else "You must provide at least one ISIN."
        )

    funds = []
    errors = []

    for entry in entries:
        isin = entry.get("isin", "")
        currency = entry.get("currency", "EUR")
        if not isin:
            continue

        try:
            snapshot = get_fund_snapshot(
                isin,
                start_date=start_date,
                currency=currency,
                frequency=frequency,
                language=language,
            )
            result = serialize_snapshot(snapshot)
            result["currency"] = currency
            funds.append(result)
        except MorningstarScraperError as error:
            errors.append({"isin": isin, "error": str(error)})
        except Exception as error:
            errors.append({"isin": isin, "error": str(error)})

    return {"funds": funds, "errors": errors}


def main() -> int:
    raw_payload = sys.argv[1] if len(sys.argv) > 1 else "{}"
    payload = json.loads(raw_payload)
    print(json.dumps(build_response(payload), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
