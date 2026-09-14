import { getI18n } from "../../lib/i18n";

export default function ViewSwitcher({ language = "en", activeView, onChange }) {
  const { viewSwitcher } = getI18n(language);

  return (
    <div className="view-switcher" role="group" aria-label={viewSwitcher.label}>
      <button
        type="button"
        className={activeView === "cards" ? "view-switcher__button active" : "view-switcher__button"}
        aria-pressed={activeView === "cards"}
        onClick={() => onChange("cards")}
      >
        {viewSwitcher.cards}
      </button>
      <button
        type="button"
        className={activeView === "compare" ? "view-switcher__button active" : "view-switcher__button"}
        aria-pressed={activeView === "compare"}
        onClick={() => onChange("compare")}
      >
        {viewSwitcher.compare}
      </button>
    </div>
  );
}
