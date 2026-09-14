import { RANGE_OPTIONS } from "../../lib/fund-data";
import { getI18n } from "../../lib/i18n";

export default function RangeSelector({ language = "en", rangeKey, onSelect }) {
  const { rangeSelector } = getI18n(language);

  return (
    <div className="range-selector" role="group" aria-label={rangeSelector.label}>
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.key === rangeKey ? "range-button active" : "range-button"}
          aria-pressed={option.key === rangeKey}
          onClick={() => onSelect(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
