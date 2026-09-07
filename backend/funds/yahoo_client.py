from __future__ import annotations

import requests
import pandas as pd
from datetime import UTC, datetime
from urllib.parse import quote

from .config import HEADERS
from .identifiers import normalize_yahoo_symbol

class YahooFinanceError(Exception):
    pass


def fetch_yahoo_history(symbol: str, *, start_date: str, currency: str,
                        frequency: str, language: str = "en"):
    symbol = normalize_yahoo_symbol(symbol)
    spanish = language == "es"
    if not symbol:
        raise YahooFinanceError("Símbolo de Yahoo inválido." if spanish else "Invalid Yahoo symbol.")
    interval = {"daily": "1d", "weekly": "1wk", "monthly": "1mo"}.get(frequency)
    if not interval:
        raise YahooFinanceError("Frecuencia no compatible con Yahoo." if spanish else "Unsupported Yahoo frequency.")
    try:
        response = _session().get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol, safe='')}",
            params={"period1": int(pd.Timestamp(start_date, tz="UTC").timestamp()),
                    "period2": int(datetime.now(UTC).timestamp()), "interval": interval},
            timeout=30,
        )
        response.raise_for_status()
        chart = response.json()["chart"]
        if chart.get("error"):
            raise ValueError("Yahoo chart error")
        result = chart["result"][0]
        metadata = result["meta"]
        actual_currency = metadata.get("currency", "")
        if currency != "AUTO" and actual_currency != currency:
            raise YahooFinanceError(
                f"Yahoo publica {symbol} en {actual_currency or '?'}. Selecciona esa divisa; no se realiza conversión."
                if spanish else f"Yahoo quotes {symbol} in {actual_currency or '?'}. Select that currency; no conversion is applied."
            )
        dates = pd.to_datetime(result["timestamp"], unit="s", utc=True)
        dates = dates.tz_convert(metadata.get("exchangeTimezoneName", "UTC")).tz_localize(None).normalize()
        # Use closing prices, consistent with Morningstar NAV rather than total returns.
        history = pd.DataFrame({"date": dates, "price": result["indicators"]["quote"][0]["close"]})
        history["price"] = pd.to_numeric(history["price"], errors="coerce")
        history = history.dropna().query("price > 0 and price < inf").drop_duplicates("date").sort_values("date")
        history = history[history["date"] >= pd.Timestamp(start_date)].reset_index(drop=True)
        if history.empty:
            raise ValueError("Empty history")
    except YahooFinanceError:
        raise
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as error:
        raise YahooFinanceError(
            f"No se pudo obtener histórico de Yahoo Finance para {symbol}. Comprueba el símbolo o inténtalo más tarde."
            if spanish else f"Could not retrieve Yahoo Finance history for {symbol}. Check the symbol or try again later."
        ) from error
    return metadata.get("longName") or metadata.get("shortName") or symbol, history, {
        "provider": "yahoo", "resolved_symbol": symbol,
        "resolved_exchange": metadata.get("exchangeName", ""),
        "resolved_currency": actual_currency, "resolved_quote_type": metadata.get("instrumentType", ""),
    }


def _session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    return session
