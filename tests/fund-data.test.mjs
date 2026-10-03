import assert from "node:assert/strict";
import { buildComparisonMetrics, buildComparisonSeries, buildCorrelationMatrix, formatPrice, getSharedWindow, normalizeFundEntry } from "../lib/fund-data.js";

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

// A weekend at the start boundary must produce the same return and sample everywhere.
const sparseFund = { isin: "AAPL", history: [
  { date: "2025-08-29", price: 100 },
  { date: "2025-09-02", price: 110 },
  { date: "2025-09-10", price: 115 },
  { date: "2025-09-30", price: 120 },
] };
for (const commonPeriod of [false, true]) {
  const chart = buildComparisonSeries([sparseFund], ["AAPL"], "1M", commonPeriod);
  const table = buildComparisonMetrics([sparseFund], "1M", "en", commonPeriod);
  assert.equal(table.sections[0].rows[0].cells[0].text, commonPeriod ? "+9.09%" : "+20.00%");
  assert.equal(table.sections[2].rows[1].cells[0].text, String(chart.length));
  assert.equal(buildCorrelationMatrix([sparseFund], "1M", commonPeriod).rows[0].cells[0].intervalCount, chart.length - 1);
  assert.ok(Math.abs(chart.at(-1).AAPL - (commonPeriod ? 100 * (120 / 110 - 1) : 20)) < 1e-9);
}
assert.equal(formatPrice(2450, "GBp", "en"), "£24.50");
assert.equal(formatPrice(2450, "GBX", "en"), "£24.50");
assert.equal(formatPrice(24.5, "GBP", "en"), "£24.50");
assert.equal(normalizeFundEntry({ isin: "IE00B4L5Y983", currency: "HKD" }).currency, "HKD");
assert.equal(normalizeFundEntry({ isin: "IE00B4L5Y983", currency: "BTC" }), null);

console.log("Fund entry and common-period checks passed.");
