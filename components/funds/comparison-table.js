"use client";

import { memo, useMemo } from "react";
import { buildComparisonMetrics, getFundDisplayName } from "../../lib/fund-data";

function ComparisonTable({ funds, rangeKey }) {
  const metrics = useMemo(() => buildComparisonMetrics(funds, rangeKey), [funds, rangeKey]);

  if (!funds.length) {
    return null;
  }

  return (
    <section className="comparison-table-panel">
      <div className="comparison-table-panel__header">
        <div>
          <p className="fund-card__eyebrow">Tabla comparativa</p>
          <p className="comparison-table-panel__lede">
            Debajo de la curva superpuesta tienes un resumen de metricas clave del periodo seleccionado y del historico completo.
          </p>
        </div>
      </div>

      <div className="comparison-table-panel__scroller">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Metrica</th>
              {funds.map((fund) => (
                <th key={fund.isin}>{getFundDisplayName(fund)}</th>
              ))}
            </tr>
          </thead>

          {metrics.sections.map((section) => (
            <tbody key={section.title}>
              <tr className="comparison-table__section-row">
                <th colSpan={funds.length + 1}>{section.title}</th>
              </tr>

              {section.rows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  {row.cells.map((cell, index) => (
                    <td key={`${funds[index].isin}-${row.label}`}>
                      <span className={cell.tone ?? undefined}>{cell.text}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <p className="comparison-table-panel__note">{metrics.note}</p>
    </section>
  );
}

export default memo(ComparisonTable);
