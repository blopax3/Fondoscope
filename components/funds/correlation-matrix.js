"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { buildCorrelationMatrix, getFundDisplayName } from "../../lib/fund-data";

const CORRELATION_TONES = {
  negative: [34, 74, 132],
  neutral: [243, 244, 240],
  positive: [146, 63, 37],
  borderBase: [173, 180, 189],
  darkText: [35, 41, 49],
  lightText: [249, 246, 241],
};

function normalizeDisplayedCorrelation(value) {
  if (!Number.isFinite(value)) {
    return value;
  }

  return Math.abs(value) < 0.005 ? 0 : value;
}

function formatCorrelation(value) {
  if (!Number.isFinite(value)) {
    return "N/D";
  }

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(normalizeDisplayedCorrelation(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mixRgb(from, to, weight) {
  return from.map((channel, index) => (
    Math.round(channel + ((to[index] - channel) * weight))
  ));
}

function toRgba([red, green, blue], alpha) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getRelativeLuminance([red, green, blue]) {
  return ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;
}

function getCorrelationDescriptor(value, isDiagonal) {
  if (!Number.isFinite(value)) {
    return "sin datos suficientes";
  }

  if (isDiagonal) {
    return "autocorrelacion";
  }

  const strength = Math.abs(value);

  if (strength < 0.1) {
    return "casi nula";
  }

  if (strength < 0.3) {
    return value > 0 ? "positiva debil" : "negativa debil";
  }

  if (strength < 0.6) {
    return value > 0 ? "positiva moderada" : "negativa moderada";
  }

  if (strength < 0.85) {
    return value > 0 ? "positiva fuerte" : "negativa fuerte";
  }

  return value > 0 ? "positiva muy fuerte" : "negativa muy fuerte";
}

function getCorrelationCellStyle(value, isDiagonal) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const clampedValue = clamp(value, -1, 1);
  const intensity = isDiagonal ? 1 : Math.abs(clampedValue);
  const directionTone = clampedValue < 0
    ? CORRELATION_TONES.negative
    : clampedValue > 0
      ? CORRELATION_TONES.positive
      : CORRELATION_TONES.neutral;
  const bgTone = clampedValue < 0
    ? mixRgb(CORRELATION_TONES.neutral, CORRELATION_TONES.negative, Math.abs(clampedValue))
    : mixRgb(CORRELATION_TONES.neutral, CORRELATION_TONES.positive, clampedValue);
  const borderTone = clampedValue < 0
    ? mixRgb(CORRELATION_TONES.borderBase, CORRELATION_TONES.negative, intensity)
    : clampedValue > 0
      ? mixRgb(CORRELATION_TONES.borderBase, CORRELATION_TONES.positive, intensity)
      : CORRELATION_TONES.borderBase;
  const textTone = getRelativeLuminance(bgTone) < 0.58
    ? CORRELATION_TONES.lightText
    : CORRELATION_TONES.darkText;

  return {
    "--correlation-cell-bg": `rgb(${bgTone.join(", ")})`,
    "--correlation-cell-border": toRgba(borderTone, isDiagonal ? 0.82 : 0.54 + (intensity * 0.18)),
    "--correlation-cell-shadow": toRgba(directionTone, isDiagonal ? 0.18 : 0.06 + (intensity * 0.12)),
    "--correlation-cell-text": `rgb(${textTone.join(", ")})`,
  };
}

function getCorrelationTitle(rowFund, columnFund, cell, isDiagonal) {
  const label = `${getFundDisplayName(rowFund)} vs ${getFundDisplayName(columnFund)}`;

  if (!Number.isFinite(cell.value)) {
    return cell.intervalCount > 0
      ? `${label}: N/D (${cell.intervalCount} intervalos compartidos)`
      : `${label}: N/D`;
  }

  return `${label}: ${formatCorrelation(cell.value)} | ${getCorrelationDescriptor(cell.value, isDiagonal)} (${cell.intervalCount} intervalos compartidos)`;
}

function CorrelationMatrix({ funds, rangeKey }) {
  const matrix = useMemo(() => buildCorrelationMatrix(funds, rangeKey), [funds, rangeKey]);
  const scrollerRef = useRef(null);
  const [isHorizontallyScrolled, setIsHorizontallyScrolled] = useState(false);
  const [highlightedRowIsin, setHighlightedRowIsin] = useState(null);
  const [highlightedColumnIsin, setHighlightedColumnIsin] = useState(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return undefined;
    }

    const syncScrollState = () => {
      const nextValue = scroller.scrollLeft > 0;
      setIsHorizontallyScrolled((currentValue) => (
        currentValue === nextValue ? currentValue : nextValue
      ));
    };

    syncScrollState();
    scroller.addEventListener("scroll", syncScrollState, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", syncScrollState);
    };
  }, [matrix.funds.length, rangeKey]);

  useEffect(() => {
    setHighlightedRowIsin(null);
    setHighlightedColumnIsin(null);
  }, [matrix.funds.length, rangeKey]);

  if (!matrix.funds.length) {
    return null;
  }

  const clearHighlight = () => {
    setHighlightedRowIsin(null);
    setHighlightedColumnIsin(null);
  };

  return (
    <section className="correlation-matrix-panel">
      <div className="correlation-matrix-panel__header">
        <div>
          <p className="fund-card__eyebrow">Correlacion</p>
        </div>

        <div className="correlation-matrix-panel__legend" aria-hidden="true">
          <div className="correlation-matrix-panel__legend-headings">
            <span>Negativa</span>
            <span>Neutra</span>
            <span>Positiva</span>
          </div>
          <span className="correlation-matrix-panel__legend-scale" />
          <div className="correlation-matrix-panel__legend-labels">
            <span>-1</span>
            <span>0</span>
            <span>+1</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="correlation-matrix-panel__scroller"
        data-scrolled={isHorizontallyScrolled ? "true" : "false"}
      >
        <table className="correlation-matrix">
          <thead>
            <tr>
              <th scope="col">Fondo</th>
              {matrix.funds.map((fund) => (
                <th
                  key={fund.isin}
                  scope="col"
                  className={highlightedColumnIsin === fund.isin ? "is-highlighted" : ""}
                  onMouseEnter={() => {
                    setHighlightedRowIsin(null);
                    setHighlightedColumnIsin(fund.isin);
                  }}
                  onMouseLeave={clearHighlight}
                >
                  {getFundDisplayName(fund)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrix.rows.map((row) => {
              const isRowHighlighted = highlightedRowIsin === row.fund.isin;

              return (
                <tr key={row.fund.isin}>
                  <th
                    scope="row"
                    className={isRowHighlighted ? "is-highlighted" : ""}
                    onMouseEnter={() => {
                      setHighlightedRowIsin(row.fund.isin);
                      setHighlightedColumnIsin(null);
                    }}
                    onMouseLeave={clearHighlight}
                  >
                    {getFundDisplayName(row.fund)}
                  </th>
                  {row.cells.map((cell, index) => {
                    const columnFund = matrix.funds[index];
                    const isDiagonal = row.fund.isin === columnFund.isin;
                    const isColumnHighlighted = highlightedColumnIsin === columnFund.isin;
                    const isHighlighted = isRowHighlighted || isColumnHighlighted;
                    const isActiveCell = isRowHighlighted && isColumnHighlighted;
                    const cellTitle = getCorrelationTitle(row.fund, columnFund, cell, isDiagonal);

                    return (
                      <td
                        key={`${row.fund.isin}-${columnFund.isin}`}
                        className={isHighlighted ? "is-highlighted" : ""}
                        onMouseEnter={() => {
                          setHighlightedRowIsin(row.fund.isin);
                          setHighlightedColumnIsin(columnFund.isin);
                        }}
                        onMouseLeave={clearHighlight}
                      >
                        <span
                          className={[
                            "correlation-matrix__cell",
                            Number.isFinite(cell.value) ? "" : "correlation-matrix__cell--na",
                            isDiagonal ? "correlation-matrix__cell--diagonal" : "",
                            isActiveCell ? "is-active" : "",
                          ].filter(Boolean).join(" ")}
                          style={getCorrelationCellStyle(cell.value, isDiagonal) ?? undefined}
                          title={cellTitle}
                          aria-label={cellTitle}
                        >
                          {formatCorrelation(cell.value)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(CorrelationMatrix);
