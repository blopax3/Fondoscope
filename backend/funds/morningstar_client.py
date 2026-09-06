from __future__ import annotations

import pandas as pd
import requests

from .config import DEFAULT_UNIVERSES, HEADERS
from .models import SearchCandidate
from .identifiers import normalize_isin


class MorningstarScraperError(Exception):
    pass


def normalize_language(language: str) -> str:
    return "es" if isinstance(language, str) and language.lower().startswith("es") else "en"


def translate(language: str, key: str, **kwargs: object) -> str:
    messages = {
        "en": {
            "search_no_results": "Morningstar returned no exact match for ISIN {isin}.",
            "search_unavailable": "Could not query Morningstar security search for ISIN {isin}: {details}",
            "unexpected_structure": "Unexpected structure in the Morningstar response for id={secid}: {payload}",
            "missing_columns": "EndDate/Value columns were not found in HistoryDetail: {columns}",
            "empty_history": "{id_kind}={candidate_id} universe={universe} -> empty history",
            "history_not_found": "Could not retrieve history with any of the tested IDs/universes.\n{details}",
        },
        "es": {
            "search_no_results": "Morningstar no devolvió ninguna coincidencia exacta para el ISIN {isin}.",
            "search_unavailable": "No se pudo consultar el buscador de Morningstar para el ISIN {isin}: {details}",
            "unexpected_structure": "Estructura inesperada en la respuesta de Morningstar para id={secid}: {payload}",
            "missing_columns": "No se encontraron columnas EndDate/Value en HistoryDetail: {columns}",
            "empty_history": "{id_kind}={candidate_id} universe={universe} -> histórico vacío",
            "history_not_found": "No pude obtener histórico con ninguno de los IDs/universos probados.\n{details}",
        },
    }

    selected_language = normalize_language(language)
    return messages[selected_language][key].format(**kwargs)


def _session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def _parse_security_search_response(payload: object, isin: str) -> list[SearchCandidate]:
    if not isinstance(payload, dict) or not isinstance(payload.get("rows"), list):
        raise ValueError("Morningstar search response is missing rows")
    results: list[SearchCandidate] = []
    seen: set[str] = set()
    for row in payload["rows"]:
        if not isinstance(row, dict) or normalize_isin(row.get("ISIN")) != isin:
            continue
        secid = row.get("SecId")
        if not isinstance(secid, str) or not secid.strip() or secid in seen:
            continue
        seen.add(secid)
        results.append(SearchCandidate(name=str(row.get("Name") or isin), raw={"i": secid.strip()}))
    return results


def search_candidates(isin: str, timeout: int = 20, language: str = "en") -> list[SearchCandidate]:
    normalized_isin = normalize_isin(isin)
    if not normalized_isin:
        raise MorningstarScraperError("ISIN inválido." if language == "es" else "Invalid ISIN.")
    # The old SecuritySearch.ashx redirects to the global homepage without results.
    # Use the same public Integrated Web Tools service as the history endpoint.
    url = "https://lt.morningstar.com/api/rest.svc/t92wz0sj7c/security/screener"
    try:
        response = _session().get(url, params={
            "page": 1,
            "pageSize": 100,
            "outputType": "json",
            "version": 1,
            "languageId": "es-ES" if normalize_language(language) == "es" else "en-GB",
            "universeIds": "|".join(DEFAULT_UNIVERSES),
            "securityDataPoints": "SecId,Name,ISIN",
            "filters": f"ISIN:EQ:{normalized_isin}",
        }, timeout=timeout)
        response.raise_for_status()
        results = _parse_security_search_response(response.json(), normalized_isin)
    except (requests.RequestException, ValueError) as error:
        raise MorningstarScraperError(
            translate(
                language,
                "search_unavailable",
                isin=normalized_isin, details=str(error),
            )
        ) from error

    if results:
        return results

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
    url = "https://lt.morningstar.com/api/rest.svc/timeseries_price/t92wz0sj7c"
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
    normalized_input = normalize_isin(isin)
    if not normalized_input:
        raise MorningstarScraperError("ISIN inválido." if language == "es" else "Invalid ISIN.")
    candidates = search_candidates(normalized_input, language=language)
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
                    "provider": "morningstar",
                    "resolved_id": candidate_id,
                    "resolved_id_kind": id_kind,
                    "resolved_universe": universe,
                }

    raise MorningstarScraperError(
        translate(language, "history_not_found", details="\n".join(errors))
    )
