"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ComparisonChart from "./funds/comparison-chart";
import FundCard from "./funds/fund-card";
import LoadingState from "./funds/loading-state";
import RangeSelector from "./funds/range-selector";
import ViewSwitcher from "./funds/view-switcher";
import { fetchFunds, MAX_FUND_ENTRIES, parseIsins } from "../lib/fund-data";
import { getI18n } from "../lib/i18n";

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "CHF", label: "CHF" },
  { value: "JPY", label: "JPY" },
  { value: "SEK", label: "SEK" },
  { value: "NOK", label: "NOK" },
  { value: "DKK", label: "DKK" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" },
];

export default function FundDashboard({ language = "en" }) {
  const { dashboard } = getI18n(language);
  const [inputValue, setInputValue] = useState("");
  const [fundEntries, setFundEntries] = useState([]);
  const [rangeKey, setRangeKey] = useState("1Y");
  const [activeView, setActiveView] = useState("cards");
  const [funds, setFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [errors, setErrors] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadingIsin, setReloadingIsin] = useState(null);
  const debounceRef = useRef(null);
  const totalInputFunds = useMemo(() => parseIsins(inputValue).length, [inputValue]);
  const overflowFundsCount = Math.max(totalInputFunds - MAX_FUND_ENTRIES, 0);

  // Auto-parse ISINs from textarea with debounce
  const syncEntries = useCallback((text) => {
    const isins = parseIsins(text, MAX_FUND_ENTRIES);
    setFundEntries((current) => {
      const existingMap = new Map(current.map((e) => [e.isin, e.currency]));
      return isins.map((isin) => ({
        isin,
        currency: existingMap.get(isin) ?? "EUR",
      }));
    });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      setFundEntries([]);
      return;
    }
    debounceRef.current = setTimeout(() => syncEntries(inputValue), 300);
    return () => clearTimeout(debounceRef.current);
  }, [inputValue, syncEntries]);

  function handleCurrencyChange(isin, currency) {
    setFundEntries((current) =>
      current.map((entry) =>
        entry.isin === isin ? { ...entry, currency } : entry
      )
    );
  }

  function handleRemoveEntry(isin) {
    setFundEntries((current) => current.filter((entry) => entry.isin !== isin));
    setInputValue((current) => {
      const isins = parseIsins(current).filter((i) => i !== isin);
      return isins.join("\n");
    });
  }

  async function loadFunds(entries) {
    setLoading(true);
    setRequestError("");

    try {
      const payload = await fetchFunds(entries, language);
      setFunds(payload.funds || []);
      setSelectedFunds((payload.funds || []).map((fund) => fund.isin));
      setErrors(payload.errors || []);
    } catch (error) {
      setFunds([]);
      setSelectedFunds([]);
      setErrors([]);
      setRequestError(error.message || dashboard.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function reloadFund(isin, currency) {
    setReloadingIsin(isin);
    try {
      const payload = await fetchFunds([{ isin, currency }], language);
      const newFund = (payload.funds || [])[0];
      if (newFund) {
        setFunds((current) =>
          current.map((f) => (f.isin === isin ? newFund : f))
        );
      }
      if (payload.errors?.length) {
        setErrors((current) => [
          ...current.filter((e) => e.isin !== isin),
          ...payload.errors,
        ]);
      }
    } catch (error) {
      setRequestError(error.message || dashboard.reloadError);
    } finally {
      setReloadingIsin(null);
    }
  }

  function handleFundCurrencyChange(isin, currency) {
    // Update the entry in the pre-load list too
    setFundEntries((current) =>
      current.map((entry) =>
        entry.isin === isin ? { ...entry, currency } : entry
      )
    );
    reloadFund(isin, currency);
  }

  const stats = useMemo(() => {
    const totalSeries = funds.reduce((acc, fund) => acc + fund.history.length, 0);
    return {
      funds: funds.length,
      points: totalSeries,
      errors: errors.length,
    };
  }, [errors.length, funds]);
  const showLoadingState = loading && !funds.length && !requestError;
  const hasResults = funds.length > 0;

  // Map ISIN -> fund name from loaded funds
  const fundNameMap = useMemo(() => {
    const map = new Map();
    for (const fund of funds) {
      if (fund.name && fund.name !== fund.isin) {
        map.set(fund.isin, fund.name);
      }
    }
    return map;
  }, [funds]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!fundEntries.length) {
      setRequestError(dashboard.missingIsin);
      return;
    }

    loadFunds(fundEntries);
  }

  function handleToggleFund(isin) {
    setSelectedFunds((current) =>
      current.includes(isin) ? current.filter((item) => item !== isin) : [...current, isin]
    );
  }

  return (
    <main className="workspace">
      <header className="workspace__header">
        <h1>Fondoscope</h1>
        <p className="workspace__subtitle">
          {dashboard.subtitle}
        </p>
      </header>

      <form className="input-bar" onSubmit={handleSubmit}>
        <div className="input-bar__body">
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={dashboard.placeholder}
            rows={3}
          />

          {fundEntries.length > 0 && (
            <div className="fund-entries">
              {fundEntries.map((entry) => {
                const fundName = fundNameMap.get(entry.isin);
                return (
                <div key={entry.isin} className="fund-entry">
                  <div className="fund-entry__info">
                    <span className="fund-entry__isin">{entry.isin}</span>
                    {fundName && <span className="fund-entry__name">{fundName}</span>}
                  </div>
                  <select
                    className="fund-entry__currency"
                    value={entry.currency}
                    onChange={(event) => handleCurrencyChange(entry.isin, event.target.value)}
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="fund-entry__remove"
                    onClick={() => handleRemoveEntry(entry.isin)}
                    title={dashboard.removeTitle}
                  >
                    ×
                  </button>
                </div>
                );
              })}
            </div>
          )}

          <div className="input-bar__actions">
            <p className="input-bar__hint">
              {overflowFundsCount
                ? dashboard.maxFundsHint(MAX_FUND_ENTRIES, overflowFundsCount)
                : fundEntries.length
                ? dashboard.selectedFundsHint(fundEntries.length)
                : dashboard.emptyHint
              }
            </p>
            <button type="submit" className="btn btn--primary" disabled={loading || !fundEntries.length}>
              {loading ? dashboard.loadingButton : dashboard.submitButton}
            </button>
          </div>
        </div>
      </form>

      {requestError ? <p className="banner banner--error">{requestError}</p> : null}

      {errors.length ? (
        <section className="feedback-block">
          <h2>{dashboard.errorSectionTitle}</h2>
          <div className="feedback-list">
            {errors.map((item) => (
              <article key={item.isin} className="feedback-card">
                <strong>{item.isin}</strong>
                <p>{item.error}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {hasResults ? (
        <div className="toolbar">
          <div className="toolbar__left">
            <ViewSwitcher language={language} activeView={activeView} onChange={setActiveView} />
            <RangeSelector rangeKey={rangeKey} onSelect={setRangeKey} />
          </div>
          <div className="toolbar__stats">
            <span>{dashboard.statsFunds(stats.funds)}</span>
            <span>·</span>
            <span>{stats.points} pts</span>
            {stats.errors > 0 && (
              <>
                <span>·</span>
                <span className="negative">{dashboard.statsErrors(stats.errors)}</span>
              </>
            )}
            <span>·</span>
            <span>{rangeKey}</span>
          </div>
        </div>
      ) : null}

      {showLoadingState
        ? <LoadingState language={language} variant={activeView === "compare" ? "compare" : "cards"} />
        : hasResults
          ? activeView === "compare"
            ? (
              <ComparisonChart
                language={language}
                funds={funds}
                selectedFunds={selectedFunds}
                rangeKey={rangeKey}
                loading={loading}
                onToggleFund={handleToggleFund}
              />
            )
            : (
              <section className="fund-grid">
                {funds.map((fund) => (
                  <FundCard
                    key={fund.isin}
                    language={language}
                    fund={fund}
                    rangeKey={rangeKey}
                    loading={loading || reloadingIsin === fund.isin}
                    currencyOptions={CURRENCY_OPTIONS}
                    onCurrencyChange={handleFundCurrencyChange}
                  />
                ))}
              </section>
            )
          : null}
    </main>
  );
}
