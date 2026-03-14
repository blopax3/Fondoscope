import { RANGE_OPTIONS } from "../../lib/fund-data";

export default function RangeSelector({ rangeKey, onSelect }) {
  return (
    <div className="range-selector">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.key === rangeKey ? "range-button active" : "range-button"}
          onClick={() => onSelect(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
