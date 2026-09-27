import assert from "node:assert/strict";
import { buildComparisonMetrics, buildComparisonSeries, getSharedWindow, normalizeFundEntry } from "../lib/fund-data.js";

const entry = normalizeFundEntry({
  isin: "IE00B4L5Y983", currency: "EUR", morningstarId: "F00000WI0D",
  morningstarName: "Exact class", name: "Chosen fund", yahooSymbol: "VWCE.DE",
});
assert.deepEqual(entry, {
  isin: "IE00B4L5Y983", yahooSymbol: "VWCE.DE", currency: "EUR",
  morningstarId: "F00000WI0D", morningstarName: "Exact class", name: "Chosen fund",
});
assert.equal(normalizeFundEntry({ isin: "AAPL", morningstarId: "BAD" }), null);

const point = (day, price) => ({ date: `2026-01-0${day}`, price });
const funds = [
  { isin: "AAPL", history: [point(1, 100), point(2, 110), point(3, 120), point(4, 132)] },
  { isin: "MSFT", history: [point(3, 200), point(4, 210), point(5, 220)] },
];
assert.deepEqual(getSharedWindow(funds, "1Y"), { startDate: "2026-01-03", endDate: "2026-01-04" });
const series = buildComparisonSeries(funds, ["AAPL", "MSFT"], "1Y");
assert.deepEqual(series.map(({ date }) => date), ["2026-01-03", "2026-01-04"]);
assert.equal(series[0].AAPL, 0);
assert.equal(series[0].MSFT, 0);
assert.ok(Math.abs(series[1].AAPL - 10) < 1e-9);
assert.ok(Math.abs(series[1].MSFT - 5) < 1e-9);
assert.equal(buildComparisonSeries(funds, ["AAPL", "MSFT"], "1Y", false)[0].date, "2026-01-01");
const coverage = buildComparisonMetrics(funds, "1Y", "en").sections[2].rows[0].cells;
assert.equal(coverage[0].text, coverage[1].text);
const noOverlap = [funds[0], { isin: "OTHER", history: [point(5, 100)] }];
assert.equal(getSharedWindow(noOverlap, "1Y"), null);
assert.deepEqual(buildComparisonSeries(noOverlap, ["AAPL", "OTHER"], "1Y"), []);

console.log("Fund entry and common-period checks passed.");
