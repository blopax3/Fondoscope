from __future__ import annotations

from datetime import UTC, datetime

from .config import DEFAULT_CURRENCY, DEFAULT_FREQUENCY, DEFAULT_START_DATE
from .models import FundSnapshot
from .morningstar_client import MorningstarScraperError, normalize_isin, resolve_history
from .identifiers import normalize_yahoo_symbol
from .yahoo_client import YahooFinanceError, fetch_yahoo_history


def get_fund_snapshot(
    isin: str,
    *,
    start_date: str = DEFAULT_START_DATE,
    currency: str = DEFAULT_CURRENCY,
    frequency: str = DEFAULT_FREQUENCY,
    language: str = "en",
    yahoo_symbol: str = "",
) -> FundSnapshot:
    normalized_isin = normalize_isin(isin)
    if not normalized_isin:
        raise ValueError("ISIN inválido." if language == "es" else "Invalid ISIN.")
    if yahoo_symbol and not normalize_yahoo_symbol(yahoo_symbol):
        raise ValueError("Símbolo de Yahoo inválido." if language == "es" else "Invalid Yahoo symbol.")
    try:
        fund_name, history, metadata = resolve_history(
            normalized_isin, start_date=start_date, currency=currency,
            frequency=frequency, language=language,
        )
        if history.empty:
            raise MorningstarScraperError("Morningstar: empty history")
    except MorningstarScraperError as error:
        if not yahoo_symbol:
            raise MorningstarScraperError(
                f"No se pudo recuperar el histórico de Morningstar. {error}\nAñade el símbolo de Yahoo Finance del mismo fondo como alternativa."
                if language == "es" else
                f"Could not retrieve Morningstar history. {error}\nAdd the Yahoo Finance symbol for the same fund as a fallback."
            ) from error
        try:
            fund_name, history, metadata = fetch_yahoo_history(
                yahoo_symbol, start_date=start_date, currency=currency,
                frequency=frequency, language=language,
            )
        except YahooFinanceError as yahoo_error:
            raise MorningstarScraperError(str(yahoo_error)) from yahoo_error

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
            "provider": snapshot.metadata.get("provider"),
            "resolvedId": snapshot.metadata.get("resolved_id"),
            "resolvedIdKind": snapshot.metadata.get("resolved_id_kind"),
            "resolvedUniverse": snapshot.metadata.get("resolved_universe"),
            "resolvedSymbol": snapshot.metadata.get("resolved_symbol"),
            "resolvedExchange": snapshot.metadata.get("resolved_exchange"),
            "resolvedCurrency": snapshot.metadata.get("resolved_currency"),
            "resolvedQuoteType": snapshot.metadata.get("resolved_quote_type"),
            "fetchedAt": snapshot.metadata.get("fetched_at"),
            "latestHistoryDate": snapshot.metadata.get("latest_history_date"),
        },
        "history": history,
    }


__all__ = ["MorningstarScraperError", "get_fund_snapshot", "serialize_snapshot"]
