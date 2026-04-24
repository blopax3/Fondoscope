from __future__ import annotations

from datetime import UTC, datetime

from .config import DEFAULT_CURRENCY, DEFAULT_FREQUENCY, DEFAULT_START_DATE
from .models import FundSnapshot
from .morningstar_client import MorningstarScraperError, normalize_isin, resolve_history


def get_fund_snapshot(
    isin: str,
    *,
    start_date: str = DEFAULT_START_DATE,
    currency: str = DEFAULT_CURRENCY,
    frequency: str = DEFAULT_FREQUENCY,
    language: str = "en",
) -> FundSnapshot:
    normalized_isin = normalize_isin(isin)

    fund_name, history, metadata = resolve_history(
        normalized_isin,
        start_date=start_date,
        currency=currency,
        frequency=frequency,
        language=language,
    )

    latest_date = None
    if not history.empty:
        latest_date = history["date"].max()
        if hasattr(latest_date, "isoformat"):
            latest_date = latest_date.isoformat()

    snapshot = FundSnapshot(
        isin=normalized_isin,
        name=fund_name or normalized_isin,
        history=history,
        metadata={
            **metadata,
            "fetched_at": datetime.now(UTC).isoformat(),
            "latest_history_date": latest_date,
        },
    )
    return snapshot


def serialize_snapshot(snapshot: FundSnapshot) -> dict[str, object]:
    history = []
    for item in snapshot.history.to_dict(orient="records"):
        date_value = item["date"]
        if hasattr(date_value, "isoformat"):
            date_value = date_value.isoformat()

        history.append({"date": date_value, "price": float(item["price"])})

    return {
        "isin": snapshot.isin,
        "name": snapshot.name,
        "metadata": {
            "resolvedId": snapshot.metadata.get("resolved_id"),
            "resolvedIdKind": snapshot.metadata.get("resolved_id_kind"),
            "resolvedUniverse": snapshot.metadata.get("resolved_universe"),
            "fetchedAt": snapshot.metadata.get("fetched_at"),
            "latestHistoryDate": snapshot.metadata.get("latest_history_date"),
        },
        "history": history,
    }


__all__ = ["MorningstarScraperError", "get_fund_snapshot", "serialize_snapshot"]
