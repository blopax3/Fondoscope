"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { buildCorrelationMatrix, getFundDisplayName } from "../../lib/fund-data";

function formatCorrelation(value) {
  if (!Number.isFinite(value)) {
    return "N/D";
  }

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value);
}

function getCorrelationCellStyle(value, isDiagonal) {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (!isDiagonal && Math.abs(value) < 0.01) {
    return {
      "--correlation-cell-bg": "rgba(255, 255, 255, 0.04)",
      "--correlation-cell-border": "rgba(255, 255, 255, 0.1)",
    };
  }

  const strength = Math.min(Math.abs(value), 1);
  const hue = isDiagonal ? 160 : value >= 0 ? 160 : 355;
  const saturation = isDiagonal ? 68 : 82;
  const bgAlpha = isDiagonal ? 0.22 : 0.1 + (strength * 0.28);
  const borderAlpha = isDiagonal ? 0.32 : 0.18 + (strength * 0.34);

  return {
    "--correlation-cell-bg": `hsla(${hue}, ${saturation}%, 52%, ${bgAlpha})`,
    "--correlation-cell-border": `hsla(${hue}, ${saturation}%, 52%, ${borderAlpha})`,
  };
}

function getCorrelationTitle(rowFund, columnFund, cell) {
  const label = `${getFundDisplayName(rowFund)} vs ${getFundDisplayName(columnFund)}`;

  if (!Number.isFinite(cell.value)) {
    return cell.intervalCount > 0
      ? `${label}: N/D (${cell.intervalCount} intervalos compartidos)`
      : `${label}: N/D`;
  }

  return `${label}: ${formatCorrelation(cell.value)} (${cell.intervalCount} intervalos compartidos)`;
}

function CorrelationMatrix({ funds, rangeKey }) {
  const matrix = useMemo(() => buildCorrelationMatrix(funds, rangeKey), [funds, rangeKey]);
  const scrollerRef = useRef(null);
  const [isHorizontallyScrolled, setIsHorizontallyScrolled] = useState(false);

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

  if (!matrix.funds.length) {
    return null;
  }

  return (
    <section className="correlation-matrix-panel">
      <div className="correlation-matrix-panel__header">
        <p className="fund-card__eyebrow">Correlación</p>

        <div className="correlation-matrix-panel__legend" aria-hidden="true">
          <span>-1</span>
          <span className="correlation-matrix-panel__legend-scale" />
          <span>+1</span>
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
              <th>Fondo</th>
              {matrix.funds.map((fund) => (
                <th key={fund.isin}>{getFundDisplayName(fund)}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.fund.isin}>
                <th>{getFundDisplayName(row.fund)}</th>
                {row.cells.map((cell, index) => {
                  const columnFund = matrix.funds[index];
                  const isDiagonal = row.fund.isin === columnFund.isin;
                  const toneClassName = Number.isFinite(cell.value)
                    ? cell.value > 0.08 || isDiagonal
                      ? "positive"
                      : cell.value < -0.08
                        ? "negative"
                        : ""
                    : "";

                  return (
                    <td key={`${row.fund.isin}-${columnFund.isin}`}>
                      <span
                        className={[
                          "correlation-matrix__cell",
                          toneClassName,
                          Number.isFinite(cell.value) ? "" : "correlation-matrix__cell--na",
                        ].filter(Boolean).join(" ")}
                        style={getCorrelationCellStyle(cell.value, isDiagonal) ?? undefined}
                        title={getCorrelationTitle(row.fund, columnFund, cell)}
                      >
                        {formatCorrelation(cell.value)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="correlation-matrix-panel__note">{matrix.note}</p>
    </section>
  );
}

export default memo(CorrelationMatrix);
