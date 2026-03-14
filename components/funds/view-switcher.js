export default function ViewSwitcher({ activeView, onChange }) {
  return (
    <div className="view-switcher">
      <button
        type="button"
        className={activeView === "cards" ? "view-switcher__button active" : "view-switcher__button"}
        onClick={() => onChange("cards")}
      >
        Vista por fondo
      </button>
      <button
        type="button"
        className={activeView === "compare" ? "view-switcher__button active" : "view-switcher__button"}
        onClick={() => onChange("compare")}
      >
        Comparar fondos
      </button>
    </div>
  );
}
