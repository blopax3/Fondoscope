"use client";

export default function LoadingState({ variant = "cards" }) {
  const itemCount = variant === "compare" ? 6 : 3;

  return (
    <section className="loading-panel" aria-live="polite" aria-busy="true">
      <div className="loading-panel__header">
        <p className="fund-card__eyebrow">Cargando</p>
        <p className="loading-panel__lede">
          Estamos preparando los datos historicos para esta vista. En cuanto lleguen, la interfaz se completa sola.
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
