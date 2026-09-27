import { normalizeFundIdentifierToken, normalizeIsinToken } from "../../../lib/fund-data";
import { normalizeLanguage, resolveRequestLanguage } from "../../../lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEARCH_TIMEOUT_MS = 1000;
const SEARCH_CACHE_CONTROL = "public, s-maxage=604800, stale-while-revalidate=2592000, stale-if-error=2592000";
const PARTIAL_SEARCH_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400";

const HEADERS = {
  "User-Agent": "Mozilla/5.0",
};

const languageHeaders = (language) => ({
  ...HEADERS,
  "Accept-Language": language === "es" ? "es-ES,es;q=0.9" : "en-GB,en;q=0.9",
});

async function searchMorningstar(query, language) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "8",
    outputType: "json",
    version: "1",
    languageId: language === "es" ? "es-ES" : "en-GB",
    universeIds: "FOEUR$$ALL|FOESP$$ALL|FOGBR$$ALL",
    securityDataPoints: "SecId,Name,ISIN,Currency",
    term: query,
  });
  const response = await fetch(`https://lt.morningstar.com/api/rest.svc/t92wz0sj7c/security/screener?${params}`, {
    headers: { ...languageHeaders(language), Referer: "https://www.morningstar.es/" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Morningstar search failed");
  const payload = await response.json();
  return (Array.isArray(payload.rows) ? payload.rows : []).flatMap((item) => {
    const identifier = normalizeIsinToken(item?.ISIN);
    const currency = String(item?.Currency || "").trim().toUpperCase();
    const morningstarId = String(item?.SecId || "").trim().toUpperCase();
    return identifier ? [{
      identifier,
      name: String(item.Name || identifier),
      type: "FUND",
      currency: /^[A-Z]{3}$/.test(currency) ? currency : "",
      exchange: "",
      provider: "morningstar",
      morningstarId: /^[A-Z0-9]{1,32}$/.test(morningstarId) ? morningstarId : "",
    }] : [];
  });
}

async function searchYahoo(query, language) {
  const params = new URLSearchParams({ q: query, quotesCount: "8", newsCount: "0" });
  const response = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?${params}`, {
    headers: languageHeaders(language),
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Yahoo search failed");
  const payload = await response.json();
  return (Array.isArray(payload.quotes) ? payload.quotes : []).flatMap((item) => {
    const identifier = normalizeFundIdentifierToken(item?.symbol);
    return identifier ? [{
      identifier,
      name: String(item.longname || item.shortname || identifier),
      type: String(item.quoteType || "").toUpperCase(),
      currency: "",
      exchange: String(item.exchDisp || item.exchange || ""),
      provider: "yahoo",
    }] : [];
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().replace(/\s+/g, " ").toLowerCase();
  const language = normalizeLanguage(url.searchParams.get("language") || resolveRequestLanguage(request.headers.get("accept-language")));
  if (query.length < 3 || query.length > 80) {
    return Response.json({ error: language === "es" ? "La búsqueda debe tener entre 3 y 80 caracteres." : "Search must be between 3 and 80 characters." }, { status: 400 });
  }

  const responses = await Promise.allSettled([searchMorningstar(query, language), searchYahoo(query, language)]);
  const results = responses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
  if (!results.length && responses.every((response) => response.status === "rejected")) {
    return Response.json({ error: language === "es" ? "No se pudo completar la búsqueda." : "Asset search failed." }, { status: 502 });
  }
  const seen = new Set();
  const complete = responses.every((response) => response.status === "fulfilled");
  const cacheControl = complete
    ? SEARCH_CACHE_CONTROL
    : PARTIAL_SEARCH_CACHE_CONTROL;
  return Response.json({ complete, results: results.filter((item) => {
    const key = `${item.provider}:${item.identifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12) }, { headers: { "Cache-Control": cacheControl } });
}
