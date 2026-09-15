import { normalizeFundIdentifierToken, normalizeIsinToken } from "../../../lib/fund-data";
import { normalizeLanguage, resolveRequestLanguage } from "../../../lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

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
    headers: { ...HEADERS, Referer: "https://www.morningstar.es/" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Morningstar search failed");
  const payload = await response.json();
  return (Array.isArray(payload.rows) ? payload.rows : []).flatMap((item) => {
    const identifier = normalizeIsinToken(item?.ISIN);
    return identifier ? [{
      identifier,
      name: String(item.Name || identifier),
      type: "FUND",
      currency: String(item.Currency || "").toUpperCase(),
      exchange: "",
      provider: "morningstar",
    }] : [];
  });
}

async function searchYahoo(query) {
  const params = new URLSearchParams({ q: query, quotesCount: "8", newsCount: "0" });
  const response = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?${params}`, {
    headers: HEADERS,
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(5000),
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
  const query = (url.searchParams.get("q") || "").trim();
  const language = normalizeLanguage(url.searchParams.get("language") || resolveRequestLanguage(request.headers.get("accept-language")));
  if (query.length < 2 || query.length > 80) {
    return Response.json({ error: language === "es" ? "La búsqueda debe tener entre 2 y 80 caracteres." : "Search must be between 2 and 80 characters." }, { status: 400 });
  }

  const responses = await Promise.allSettled([searchMorningstar(query, language), searchYahoo(query)]);
  const results = responses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
  if (!results.length && responses.every((response) => response.status === "rejected")) {
    return Response.json({ error: language === "es" ? "No se pudo completar la búsqueda." : "Asset search failed." }, { status: 502 });
  }
  const seen = new Set();
  return Response.json({ results: results.filter((item) => {
    const key = `${item.provider}:${item.identifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12) });
}
