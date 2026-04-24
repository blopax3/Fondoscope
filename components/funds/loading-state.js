"use client";

import { getI18n } from "../../lib/i18n";

export default function LoadingState({ language = "en", variant = "cards" }) {
  const { loadingState } = getI18n(language);
  const itemCount = variant === "compare" ? 6 : 3;

  return (
    <section className="loading-panel" aria-live="polite" aria-busy="true">
      <div className="loading-panel__header">
        <p className="fund-card__eyebrow">{loadingState.eyebrow}</p>
        <p className="loading-panel__lede">
          {loadingState.lede}
        </p>
      </div>

      <div className={variant === "compare" ? "loading-panel__compare" : "loading-panel__cards"}>
        {Array.from({ length: itemCount }, (_, index) => (
          <div key={index} className="loading-panel__pulse" />
        ))}
      </div>
    </section>
  );
}
