import assert from "node:assert/strict";
import { GET } from "../app/api/search/route.js";
import { fetchAssetSearch } from "../lib/fund-data.js";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
try {
  const request = () => new Request("http://localhost/api/search?q=azvalor&language=es");
  globalThis.fetch = async () => Response.json({ error: "Provider unavailable" });
  let response = await GET(request());
  assert.equal(response.status, 502);
  assert.equal(response.headers.has("cache-control"), false);

  globalThis.fetch = async (url) => Response.json(String(url).includes("morningstar") ? { error: "Unavailable" } : { quotes: [{ symbol: "AAPL", longname: "Apple" }] });
  response = await GET(request());
  let body = await response.json();
  assert.equal(body.complete, false);
  assert.equal(body.results[0].identifier, "AAPL");
  assert.match(response.headers.get("cache-control"), /s-maxage=300,/);

  globalThis.fetch = async (url) => Response.json(String(url).includes("morningstar") ? { rows: [] } : { quotes: [] });
  response = await GET(request());
  body = await response.json();
  assert.equal(body.complete, true);
  assert.deepEqual(body.results, []);
  assert.match(response.headers.get("cache-control"), /s-maxage=604800,/);

  // Old empty results may come from malformed responses; they must be queried again.
  const storage = new Map([["fondoscope.search.v1:es:apple", JSON.stringify({ expiresAt: Date.now() + 604800000, results: [] })]]);
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    return Response.json({ complete: true, results: [{ identifier: "AAPL" }] });
  };
  assert.deepEqual(await fetchAssetSearch("Apple", "es"), [{ identifier: "AAPL" }]);
  assert.deepEqual(await fetchAssetSearch("Apple", "es"), [{ identifier: "AAPL" }]);
  assert.equal(fetches, 1);
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}
console.log("Search response validation and partial-cache checks passed.");
