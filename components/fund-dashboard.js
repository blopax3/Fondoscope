"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ComparisonChart from "./funds/comparison-chart";
import FundCard from "./funds/fund-card";
import LoadingState from "./funds/loading-state";
import RangeSelector from "./funds/range-selector";
import ViewSwitcher from "./funds/view-switcher";
import { useSavedPortfolios } from "./use-saved-portfolios";
import { fetchFunds, MAX_FUND_ENTRIES, parseIsins, RANGE_OPTIONS } from "../lib/fund-data";
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

function buildEntriesFromQuery(query) {
  const isins = parseIsins(query.get("isins") || "", MAX_FUND_ENTRIES);
  const currencies = (query.get("currencies") || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  return isins.map((isin, index) => ({
    isin,
    currency: currencies[index] || "EUR",
  }));
}

function normalizeRange(value) {
  return RANGE_OPTIONS.some((option) => option.key === value) ? value : "1Y";
}

function resolveInitialTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem("fondoscope-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

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
  const initializedFromUrl = useRef(false);
  const portfolioNameInputRef = useRef(null);
  const [theme, setTheme] = useState("dark");
  const { portfolios, savePortfolio, removePortfolio } = useSavedPortfolios();
  const totalInputFunds = useMemo(() => parseIsins(inputValue).length, [inputValue]);
  const overflowFundsCount = Math.max(totalInputFunds - MAX_FUND_ENTRIES, 0);

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

  const loadFunds = useCallback(async (entries) => {
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
  }, [dashboard.loadError, language]);

  useEffect(() => {
    if (initializedFromUrl.current) {
      return;
    }

    initializedFromUrl.current = true;
    const query = new URLSearchParams(window.location.search);
    const entriesFromQuery = buildEntriesFromQuery(query);
    const queryRange = normalizeRange(query.get("range") || "1Y");
    setRangeKey(queryRange);

    if (entriesFromQuery.length) {
      setFundEntries(entriesFromQuery);
      setInputValue(entriesFromQuery.map((entry) => entry.isin).join("\n"));
      loadFunds(entriesFromQuery);
    }
  }, [loadFunds]);

  useEffect(() => {
    const nextTheme = resolveInitialTheme();
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("fondoscope-theme", theme);
  }, [theme]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      setFundEntries([]);
      return;
    }
    debounceRef.current = setTimeout(() => syncEntries(inputValue), 300);
    return () => clearTimeout(debounceRef.current);
  }, [inputValue, syncEntries]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    if (fundEntries.length) {
      query.set("isins", fundEntries.map((entry) => entry.isin).join(","));
      query.set("currencies", fundEntries.map((entry) => entry.currency).join(","));
      query.set("range", rangeKey);
    } else {
      query.delete("isins");
      query.delete("currencies");
      query.delete("range");
    }

    const next = query.toString();
    const pathname = window.location.pathname;
    window.history.replaceState({}, "", next ? `${pathname}?${next}` : pathname);
  }, [fundEntries, rangeKey]);

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
    setFundEntries((current) =>
      current.map((entry) =>
        entry.isin === isin ? { ...entry, currency } : entry
      )
    );
    reloadFund(isin, currency);
  }

  function handleSaveComparison() {
    if (!fundEntries.length) {
      setRequestError(dashboard.missingIsin);
      return;
    }

    const fallbackName = `${dashboard.defaultPortfolioName} ${new Date().toLocaleDateString()}`;
    const rawPortfolioName = portfolioNameInputRef.current?.value || "";
    const targetName = rawPortfolioName.trim() || fallbackName;
    const saved = savePortfolio(targetName, fundEntries);

    if (!saved) {
      setRequestError(dashboard.portfolioSaveError);
      return;
    }

    if (portfolioNameInputRef.current) {
      portfolioNameInputRef.current.value = "";
    }
    setRequestError("");
  }

  function handleQuickLoadPortfolio(id) {
    const selected = portfolios.find((portfolio) => portfolio.id === id);
    if (!selected) {
      setRequestError(dashboard.portfolioMissingSelection);
      return;
    }

    setFundEntries(selected.entries);
    setInputValue(selected.entries.map((entry) => entry.isin).join("\n"));
    loadFunds(selected.entries);
    setRequestError("");
  }

  function handleDeletePortfolio(id) {
    removePortfolio(id);
    setRequestError("");
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
  const nextTheme = theme === "dark" ? "light" : "dark";

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
      <section className="workspace__masthead">
        <header className="workspace__header">
          <h1>Fondoscope</h1>
          <p className="workspace__subtitle">
            {dashboard.subtitle}
          </p>
        </header>

        <div className="workspace__masthead-side">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(nextTheme)}
            aria-label={dashboard.themeToggleLabel(nextTheme)}
            title={dashboard.themeToggleLabel(nextTheme)}
          >
            {dashboard.themeToggleShort(nextTheme)}
          </button>

          <dl className="workspace__summary" aria-label={language === "es" ? "Resumen" : "Summary"}>
            <div className="workspace__summary-item">
              <dt>{language === "es" ? "Entradas" : "Entries"}</dt>
              <dd>{fundEntries.length}</dd>
            </div>
            <div className="workspace__summary-item">
              <dt>{language === "es" ? "Fondos cargados" : "Loaded funds"}</dt>
              <dd>{stats.funds}</dd>
            </div>
            <div className="workspace__summary-item">
              <dt>{language === "es" ? "Rango activo" : "Active range"}</dt>
              <dd>{rangeKey}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="workspace__content">
        <aside className="control-rail">
          <form className="input-bar panel-section" onSubmit={handleSubmit}>
            <div className="panel-section__header">
              <h2>{dashboard.loadSectionTitle}</h2>
              <p>{dashboard.loadSectionDescription}</p>
            </div>

            <div className="input-bar__body">
              <div className="input-bar__editor">
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
            </div>
          </form>

          <section className="portfolio-controls panel-section" aria-label={dashboard.portfolioSectionLabel}>
            <div className="panel-section__header panel-section__header--compact">
              <div className="portfolio-controls__header">
                <strong>{dashboard.portfolioSectionLabel}</strong>
                {portfolios.length ? <span>{dashboard.savedPortfoliosCount(portfolios.length)}</span> : null}
              </div>
              <p>{dashboard.portfolioSectionDescription}</p>
            </div>

            <div className="portfolio-controls__bar">
              <div className="portfolio-inline-group">
                <input
                  ref={portfolioNameInputRef}
                  className="portfolio-controls__name"
                  type="text"
                  placeholder={dashboard.portfolioNamePlaceholder}
                />
                <button type="button" className="btn btn--secondary" onClick={handleSaveComparison}>
                  {dashboard.saveComparisonButton}
                </button>
              </div>
            </div>

            <div className="portfolio-list" data-empty={portfolios.length ? "false" : "true"}>
              {portfolios.length ? (
                portfolios.map((portfolio) => (
                  <div key={portfolio.id} className="portfolio-item">
                    <button
                      type="button"
                      className="portfolio-item__meta"
                      onClick={() => handleQuickLoadPortfolio(portfolio.id)}
                      title={dashboard.loadPortfolioButton}
                    >
                      <span className="portfolio-item__name">{portfolio.name}</span>
                      <span className="portfolio-item__count">
                        {dashboard.portfolioFundCount(portfolio.entries.length)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="portfolio-item__delete"
                      onClick={() => handleDeletePortfolio(portfolio.id)}
                      title={dashboard.deletePortfolioButton}
                      aria-label={`${dashboard.deletePortfolioButton}: ${portfolio.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <p className="portfolio-list__empty">{dashboard.portfolioListEmpty}</p>
              )}
            </div>
          </section>
        </aside>

        <section className="analysis-column">
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

          {showLoadingState ? (
            <LoadingState language={language} variant={activeView === "compare" ? "compare" : "cards"} />
          ) : hasResults ? (
            activeView === "compare" ? (
              <ComparisonChart
                language={language}
                funds={funds}
                selectedFunds={selectedFunds}
                rangeKey={rangeKey}
                loading={loading}
                onToggleFund={handleToggleFund}
              />
            ) : (
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
          ) : (
            <section className="empty-analysis">
              <h2>{dashboard.analysisEmptyTitle}</h2>
              <p>{dashboard.analysisEmptyDescription}</p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
