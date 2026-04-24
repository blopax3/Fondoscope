from __future__ import annotations

import json
import re

import pandas as pd
import requests

from .config import DEFAULT_UNIVERSES, HEADERS
from .models import SearchCandidate


class MorningstarScraperError(Exception):
    pass


def normalize_language(language: str) -> str:
    return "es" if isinstance(language, str) and language.lower().startswith("es") else "en"


def translate(language: str, key: str, **kwargs: object) -> str:
    messages = {
        "en": {
            "search_no_results": "No results were found in SecuritySearch.ashx for ISIN {isin}",
            "unexpected_structure": "Unexpected structure in the Morningstar response for id={secid}: {payload}",
            "missing_columns": "EndDate/Value columns were not found in HistoryDetail: {columns}",
            "empty_history": "{id_kind}={candidate_id} universe={universe} -> empty history",
            "history_not_found": "Could not retrieve history with any of the tested IDs/universes.\n{details}",
        },
        "es": {
            "search_no_results": "No se encontraron resultados en SecuritySearch.ashx para el ISIN {isin}",
            "unexpected_structure": "Estructura inesperada en la respuesta de Morningstar para id={secid}: {payload}",
            "missing_columns": "No se encontraron columnas EndDate/Value en HistoryDetail: {columns}",
            "empty_history": "{id_kind}={candidate_id} universe={universe} -> histórico vacío",
            "history_not_found": "No pude obtener histórico con ninguno de los IDs/universos probados.\n{details}",
        },
    }

    selected_language = normalize_language(language)
    return messages[selected_language][key].format(**kwargs)


def normalize_isin(isin: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", isin).upper()


def _session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def _parse_security_search_response(text: str) -> list[SearchCandidate]:
    results: list[SearchCandidate] = []
    previous_part = ""

    for part in text.split("|"):
        part = part.strip()
        if part.startswith("{") and part.endswith("}"):
            try:
                item = json.loads(part)
            except json.JSONDecodeError:
                continue

            candidate_name = str(item.get("name") or item.get("n") or previous_part or "")
            results.append(SearchCandidate(name=candidate_name, raw=item))
        elif part:
            previous_part = part

    return results


def search_candidates(isin: str, timeout: int = 20, language: str = "en") -> list[SearchCandidate]:
    normalized_isin = normalize_isin(isin)
    url = "https://www.morningstar.es/es/util/SecuritySearch.ashx"
    session = _session()

    for method, kwargs in (
        ("post", {"data": {"q": normalized_isin}}),
        ("get", {"params": {"q": normalized_isin}}),
    ):
        try:
            response = getattr(session, method)(url, timeout=timeout, **kwargs)
            response.raise_for_status()
            results = _parse_security_search_response(response.text)
            if results:
                return results
        except requests.RequestException:
            continue

    raise MorningstarScraperError(
        translate(language, "search_no_results", isin=normalized_isin)
    )


def fetch_history_by_id(
    secid: str,
    *,
    start_date: str,
    currency: str,
    frequency: str,
    universe: str,
    timeout: int = 30,
    language: str = "en",
) -> pd.DataFrame:
    url = "https://tools.morningstar.es/api/rest.svc/timeseries_price/t92wz0sj7c"
    params = {
        "idtype": "Morningstar",
        "frequency": frequency,
        "outputType": "JSON",
        "startDate": start_date,
        "id": f"{secid}]2]0]{universe}",
    }
    if currency:
        params["currencyId"] = currency

    response = _session().get(url, params=params, timeout=timeout)
    response.raise_for_status()
    payload = response.json()

    try:
        history = payload["TimeSeries"]["Security"][0]["HistoryDetail"]
    except (KeyError, IndexError, TypeError) as error:
        raise MorningstarScraperError(
            translate(language, "unexpected_structure", secid=secid, payload=payload)
        ) from error

    if not history:
        return pd.DataFrame(columns=["date", "price"])

    dataframe = pd.DataFrame(history)
    if "EndDate" not in dataframe.columns or "Value" not in dataframe.columns:
        raise MorningstarScraperError(
            translate(language, "missing_columns", columns=dataframe.columns.tolist())
        )

    dataframe = dataframe.rename(columns={"EndDate": "date", "Value": "price"})
    dataframe["date"] = pd.to_datetime(dataframe["date"], errors="coerce")
    dataframe["price"] = pd.to_numeric(dataframe["price"], errors="coerce")

    return (
        dataframe[["date", "price"]]
        .dropna(subset=["date", "price"])
        .sort_values("date")
        .reset_index(drop=True)
    )


def resolve_history(
    isin: str,
    *,
    start_date: str,
    currency: str,
    frequency: str,
    universes: tuple[str, ...] = DEFAULT_UNIVERSES,
    language: str = "en",
) -> tuple[str, pd.DataFrame, dict[str, str]]:
    candidates = search_candidates(isin, language=language)
    errors: list[str] = []

    for candidate in candidates:
        for id_kind, candidate_id in candidate.candidate_ids:
            for universe in universes:
                try:
                    history = fetch_history_by_id(
                        candidate_id,
                        start_date=start_date,
                        currency=currency,
                        frequency=frequency,
                        universe=universe,
                        language=language,
                    )
                except Exception as error:
                    errors.append(f"{id_kind}={candidate_id} universe={universe} -> {error}")
                    continue

                if history.empty:
                    errors.append(
                        translate(
                            language,
                            "empty_history",
                            id_kind=id_kind,
                            candidate_id=candidate_id,
                            universe=universe,
                        )
                    )
                    continue

                return candidate.name or normalize_isin(isin), history, {
                    "resolved_id": candidate_id,
                    "resolved_id_kind": id_kind,
                    "resolved_universe": universe,
                }

    raise MorningstarScraperError(
        translate(language, "history_not_found", details="\n".join(errors))
    )
