from __future__ import annotations

import requests

from .config import HEADERS

YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"
ALLOWED_QUOTE_TYPES = {"MUTUALFUND", "ETF"}


class YahooFinanceError(Exception):
    pass


def _session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def search_symbol_by_isin(isin: str, timeout: int = 20) -> dict[str, str]:
    try:
        response = _session().get(
            YAHOO_SEARCH_URL,
            params={"q": isin, "quotesCount": 10, "newsCount": 0},
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as error:
        raise YahooFinanceError(f"No se pudo consultar Yahoo Finance para el ISIN {isin}.") from error

    quotes = payload.get("quotes")
    if not isinstance(quotes, list):
        raise YahooFinanceError(f"Yahoo Finance devolvio una estructura inesperada para el ISIN {isin}.")

    for quote in quotes:
        if not isinstance(quote, dict):
            continue

        symbol = str(quote.get("symbol") or "").strip()
        quote_type = str(quote.get("quoteType") or "").strip().upper()
        if not symbol or quote_type not in ALLOWED_QUOTE_TYPES:
            continue

        name = str(quote.get("longname") or quote.get("shortname") or isin).strip() or isin
        exchange = str(quote.get("exchange") or quote.get("exchDisp") or "").strip()
        return {
            "symbol": symbol,
            "name": name,
            "quote_type": quote_type,
            "exchange": exchange,
        }

    raise YahooFinanceError(f"No se encontro ningun instrumento compatible en Yahoo Finance para el ISIN {isin}.")
