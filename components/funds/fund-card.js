"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeChange,
  filterSeries,
  formatCompactDate,
  formatDateLabel,
  formatPercent,
  formatPrice,
  getFundLabel,
} from "../../lib/fund-data";
import { getI18n } from "../../lib/i18n";

export default function FundCard({
  language = "en",
  fund,
  rangeKey,
  loading,
  currencyOptions,
  onCurrencyChange,
}) {
  const { fundCard } = getI18n(language);
  const filteredSeries = filterSeries(fund.history, rangeKey);
  const latestPoint = filteredSeries[filteredSeries.length - 1] ?? fund.history[fund.history.length - 1];
  const oldestPoint = filteredSeries[0];
  const change = computeChange(filteredSeries);

  return (
    <article className={loading ? "fund-card fund-card--loading" : "fund-card"}>
      <div className="fund-card__header">
        <div>
          <h2>{getFundLabel(fund)}</h2>
          <p className="fund-card__identifier">{fund.isin}</p>
        </div>
        <div className="fund-card__meta">
          {currencyOptions && onCurrencyChange ? (
            <select
              className="fund-card__currency-select"
              value={fund.currency || "EUR"}
              onChange={(event) => onCurrencyChange(fund.isin, event.target.value)}
              disabled={loading}
            >
              {currencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            fund.currency && <span className="fund-card__currency">{fund.currency}</span>
          )}
        </div>
      </div>

      <div className="fund-card__stats">
        <div>
          <span>{fundCard.latestValue}</span>
          <strong>{latestPoint ? formatPrice(latestPoint.price, fund.currency, language) : fundCard.noData}</strong>
        </div>
        <div>
          <span>{fundCard.window}</span>
          <strong>
            {oldestPoint
              ? `${formatDateLabel(oldestPoint.date, language)} - ${formatDateLabel(latestPoint.date, language)}`
              : fundCard.noData}
          </strong>
        </div>
        <div>
          <span>{fundCard.variation}</span>
          <strong className={change && change.absolute < 0 ? "negative" : "positive"}>
            {change
              ? `${change.absolute >= 0 ? "+" : ""}${formatPrice(change.absolute, fund.currency, language)}${change.percent != null ? ` (${formatPercent(change.percent, 2, language)})` : ""}`
              : fundCard.noData}
          </strong>
        </div>
      </div>

      <div className="fund-card__chart">
        {filteredSeries.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredSeries} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatCompactDate(value, language)}
                tick={{ fill: "var(--chart-tick)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => value.toFixed(0)}
                tick={{ fill: "var(--chart-tick)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--tooltip-bg)",
                  border: "1px solid var(--tooltip-border)",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  color: "var(--text)",
                }}
                labelFormatter={(value) => formatDateLabel(value, language)}
                formatter={(value) => [formatPrice(value, fund.currency, language), fundCard.navLabel]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#00c896"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#00c896" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">{fundCard.noWindowData}</div>
        )}
      </div>

      {loading ? (
        <div className="loading-overlay loading-overlay--compact" aria-live="polite" aria-busy="true">
          <div className="loading-overlay__badge">
            <span className="loading-overlay__spinner" aria-hidden="true" />
            {fundCard.updating}
          </div>
        </div>
      ) : null}
    </article>
  );
}
