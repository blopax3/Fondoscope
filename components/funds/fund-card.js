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
          <p className="fund-card__eyebrow">{fundCard.eyebrow}</p>
          <h2>{getFundLabel(fund)}</h2>
        </div>
        <div className="fund-card__meta">
          <span>{fund.isin}</span>
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
              <defs>
                <linearGradient id={`line-${fund.isin}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00c896" />
                  <stop offset="100%" stopColor="#5b8def" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatCompactDate(value, language)}
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => value.toFixed(0)}
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f0f12",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
                labelFormatter={(value) => formatDateLabel(value, language)}
                formatter={(value) => [formatPrice(value, fund.currency, language), fundCard.navLabel]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={`url(#line-${fund.isin})`}
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
