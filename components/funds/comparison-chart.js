"use client";

import { useMemo } from "react";
import ComparisonTable from "./comparison-table";
import CorrelationMatrix from "./correlation-matrix";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildComparisonSeries,
  formatCompactDate,
  formatDateLabel,
  formatPercent,
  FUND_COLORS,
  getFundDisplayName,
} from "../../lib/fund-data";
import { getI18n } from "../../lib/i18n";

export default function ComparisonChart({
  language = "en",
  funds,
  selectedFunds,
  rangeKey,
  loading,
  onToggleFund,
}) {
  const { comparisonChart } = getI18n(language);
  const selectedFundsSet = useMemo(() => new Set(selectedFunds), [selectedFunds]);
  const visibleFunds = useMemo(
    () => funds.filter((fund) => selectedFundsSet.has(fund.isin)),
    [funds, selectedFundsSet]
  );
  const chartData = useMemo(
    () => buildComparisonSeries(funds, selectedFunds, rangeKey),
    [funds, selectedFunds, rangeKey]
  );

  return (
    <section className={loading ? "comparison-panel comparison-panel--loading" : "comparison-panel"}>
      <div className="comparison-panel__header">
        <div>
          <p className="fund-card__eyebrow">{comparisonChart.eyebrow}</p>
          <p className="comparison-panel__lede">
            {comparisonChart.lede}
          </p>
        </div>
        <div className="comparison-panel__range">{rangeKey}</div>
      </div>

      <div className="comparison-selector">
        {funds.map((fund, index) => {
          const active = selectedFundsSet.has(fund.isin);

          return (
            <button
              key={fund.isin}
              type="button"
              className={active ? "comparison-chip active" : "comparison-chip"}
              onClick={() => onToggleFund(fund.isin)}
            >
              <span
                className="comparison-chip__swatch"
                style={{ backgroundColor: FUND_COLORS[index % FUND_COLORS.length] }}
              />
              {getFundDisplayName(fund)}
            </button>
          );
        })}
      </div>

      <div className="comparison-panel__chart">
        {visibleFunds.length && chartData.length ? (
          <ResponsiveContainer width="100%" height={420}>
            <LineChart
              key={`${rangeKey}-${visibleFunds.map((fund) => fund.isin).join("-")}`}
              data={chartData}
              margin={{ top: 16, right: 12, left: 0, bottom: 12 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatCompactDate(value, language)}
                tick={{ fill: "rgba(226,221,213,0.74)", fontSize: 12, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
                tickMargin={10}
                height={42}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                tickFormatter={(value) => formatPercent(value, 0, language)}
                tick={{ fill: "rgba(226,221,213,0.74)", fontSize: 12, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "#111218",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#f6f1ea",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.82rem",
                }}
                labelFormatter={(value) => formatDateLabel(value, language)}
                formatter={(value, name) => [formatPercent(Number(value), 2, language), name]}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "18px",
                  color: "rgba(226, 221, 213, 0.82)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.82rem",
                }}
              />
              {visibleFunds.map((fund, index) => (
                <Line
                  key={fund.isin}
                  type="monotone"
                  dataKey={fund.isin}
                  name={getFundDisplayName(fund)}
                  stroke={FUND_COLORS[index % FUND_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            {comparisonChart.empty}
          </div>
        )}
      </div>

      {visibleFunds.length ? <ComparisonTable language={language} funds={visibleFunds} rangeKey={rangeKey} /> : null}

      {visibleFunds.length ? <CorrelationMatrix language={language} funds={visibleFunds} rangeKey={rangeKey} /> : null}

      {loading ? (
        <div className="loading-overlay" aria-live="polite" aria-busy="true">
          <div className="loading-overlay__badge">
            <span className="loading-overlay__spinner" aria-hidden="true" />
            {comparisonChart.updating}
          </div>
        </div>
      ) : null}
    </section>
  );
}
