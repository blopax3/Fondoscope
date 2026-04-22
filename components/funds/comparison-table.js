"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { buildComparisonMetrics, getFundDisplayName } from "../../lib/fund-data";

function ComparisonTable({ funds, rangeKey }) {
  const metrics = useMemo(() => buildComparisonMetrics(funds, rangeKey), [funds, rangeKey]);
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
  }, [funds.length, rangeKey]);

  if (!funds.length) {
    return null;
  }

  return (
    <section className="comparison-table-panel">
      <div className="comparison-table-panel__header">
        <p className="fund-card__eyebrow">Tabla comparativa</p>
      </div>

      <div
        ref={scrollerRef}
        className="comparison-table-panel__scroller"
        data-scrolled={isHorizontallyScrolled ? "true" : "false"}
      >
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Métrica</th>
              {funds.map((fund) => (
                <th key={fund.isin}>{getFundDisplayName(fund)}</th>
              ))}
            </tr>
          </thead>

          {metrics.sections.map((section) => (
            <tbody key={section.title}>
              <tr className="comparison-table__section-row">
                <th scope="rowgroup">{section.title}</th>
                <td colSpan={funds.length} aria-hidden="true" />
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
