"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ComparisonChart from "./funds/comparison-chart";
import FundCard from "./funds/fund-card";
import LoadingState from "./funds/loading-state";
import RangeSelector from "./funds/range-selector";
import ViewSwitcher from "./funds/view-switcher";
import { useSavedPortfolios } from "./use-saved-portfolios";
import { fetchAssetSearch, fetchFunds, isYahooFundIdentifier, MAX_FUND_ENTRIES, parseFundIdentifiers, RANGE_OPTIONS } from "../lib/fund-data";
import { getI18n } from "../lib/i18n";

function buildEntriesFromQuery(query) {
  const identifiers = parseFundIdentifiers(
    query.get("identifiers") || query.get("isins") || "",
    MAX_FUND_ENTRIES
  );
  return identifiers.map((identifier) => ({
    isin: identifier,
    yahooSymbol: isYahooFundIdentifier(identifier) ? identifier : "",
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
  const [fundEntries, setFundEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [rangeKey, setRangeKey] = useState("1Y");
  const [activeView, setActiveView] = useState("cards");
  const [funds, setFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [errors, setErrors] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const initializedFromUrl = useRef(false);
  const loadAbortControllerRef = useRef(null);
  const searchAbortControllerRef = useRef(null);
  const portfolioNameInputRef = useRef(null);
  const [theme, setTheme] = useState("dark");
  const [shareStatus, setShareStatus] = useState("");
  const { portfolios, savePortfolio, removePortfolio } = useSavedPortfolios();
  function handleRemoveEntry(isin) {
    setFundEntries((current) => current.filter((entry) => entry.isin !== isin));
  }

  const loadFunds = useCallback(async (entries) => {
    loadAbortControllerRef.current?.abort();
    const controller = new AbortController();
    loadAbortControllerRef.current = controller;
    setLoading(true);
    setRequestError("");

    try {
      const payload = await fetchFunds(entries, language, controller.signal);
      setFunds(payload.funds || []);
      setSelectedFunds((payload.funds || []).map((fund) => fund.isin));
      setErrors(payload.errors || []);
    } catch (error) {
      if (error.name === "AbortError") return;
      setFunds([]);
      setSelectedFunds([]);
      setErrors([]);
      setRequestError(error.message || dashboard.loadError);
    } finally {
      if (loadAbortControllerRef.current === controller) {
        loadAbortControllerRef.current = null;
        setLoading(false);
      }
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
      loadFunds(entriesFromQuery);
    }
  }, [loadFunds]);

  useEffect(() => () => {
    const loadController = loadAbortControllerRef.current;
    const searchController = searchAbortControllerRef.current;
    loadAbortControllerRef.current = null;
    searchAbortControllerRef.current = null;
    loadController?.abort();
    searchController?.abort();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    searchAbortControllerRef.current?.abort();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return undefined;
    }

    const controller = new AbortController();
    searchAbortControllerRef.current = controller;
    setSearchLoading(true);
    setSearchError("");
    const timeout = window.setTimeout(async () => {
      try {
        setSearchResults(await fetchAssetSearch(query, language, controller.signal));
        setActiveSearchIndex(0);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSearchResults([]);
          setSearchError(dashboard.searchError);
        }
      } finally {
        if (searchAbortControllerRef.current === controller) setSearchLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [dashboard.searchError, language, searchQuery]);

  useEffect(() => {
    const nextTheme = resolveInitialTheme();
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("fondoscope-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const timeout = window.setTimeout(() => setShareStatus(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setShareStatus("");

    if (fundEntries.length) {
      query.set("identifiers", fundEntries.map((entry) => entry.isin).join(","));
      query.set("range", rangeKey);
      query.delete("isins");
      query.delete("currencies");
      query.delete("yahooSymbols");
    } else {
      query.delete("identifiers");
      query.delete("isins");
      query.delete("currencies");
      query.delete("yahooSymbols");
      query.delete("range");
    }

    const next = query.toString();
    const pathname = window.location.pathname;
    window.history.replaceState({}, "", next ? `${pathname}?${next}` : pathname);
  }, [fundEntries, rangeKey]);

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

  const availableSearchResults = searchResults.filter(
    (result) => !fundEntries.some((entry) => entry.isin === result.identifier)
  );

  function handleAddSearchResult(result) {
    if (!result || fundEntries.length >= MAX_FUND_ENTRIES) return;
    setFundEntries((current) => [...current, {
      isin: result.identifier,
      yahooSymbol: result.provider === "yahoo" ? result.identifier : "",
      name: result.name,
      provider: result.provider,
    }]);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    setRequestError("");
  }

  function handleSearchKeyDown(event) {
    if (!searchOpen) return;
    if (event.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (!availableSearchResults.length) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveSearchIndex((current) => (current + direction + availableSearchResults.length) % availableSearchResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleAddSearchResult(availableSearchResults[activeSearchIndex]);
    }
  }

  function handleToggleFund(isin) {
    setSelectedFunds((current) =>
      current.includes(isin) ? current.filter((item) => item !== isin) : [...current, isin]
    );
  }

  async function handleShareComparison() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(dashboard.shareSuccess);
      setRequestError("");
    } catch {
      setShareStatus("");
      setRequestError(dashboard.shareError);
    }
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
          <div className="workspace__actions">
            <button type="button" className="btn btn--secondary btn--share" onClick={handleShareComparison} disabled={!fundEntries.length}>
              <span className={!shareStatus ? "is-visible" : ""}>{dashboard.shareButton}</span>
              <span className={shareStatus ? "is-visible" : ""} aria-live="polite">{shareStatus}</span>
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(nextTheme)}
              aria-label={dashboard.themeToggleLabel(nextTheme)}
              title={dashboard.themeToggleLabel(nextTheme)}
            >
              {dashboard.themeToggleShort(nextTheme)}
            </button>
          </div>

          <dl className="workspace__summary" aria-label={language === "es" ? "Resumen" : "Summary"}>
            <div className="workspace__summary-item">
              <dt>{language === "es" ? "Entradas" : "Entries"}</dt>
              <dd>{fundEntries.length}</dd>
            </div>
            <div className="workspace__summary-item">
              <dt>{language === "es" ? "Activos cargados" : "Loaded assets"}</dt>
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
                <label htmlFor="asset-search">{dashboard.searchLabel}</label>
                <div
                  className="asset-search"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
                  }}
                >
                  <input
                    id="asset-search"
                    type="search"
                    role="combobox"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="asset-search-results"
                    aria-expanded={searchOpen && searchQuery.trim().length >= 2}
                    aria-activedescendant={searchOpen && availableSearchResults.length ? `asset-search-result-${activeSearchIndex}` : undefined}
                    value={searchQuery}
                    disabled={fundEntries.length >= MAX_FUND_ENTRIES}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={dashboard.searchPlaceholder}
                  />

                  {searchOpen && searchQuery.trim().length >= 2 && (
                    <div id="asset-search-results" className="asset-search__results" role="listbox">
                      {searchLoading ? (
                        <p className="asset-search__status">{dashboard.searching}</p>
                      ) : searchError ? (
                        <p className="asset-search__status asset-search__status--error">{searchError}</p>
                      ) : availableSearchResults.length ? (
                        availableSearchResults.map((result, index) => (
                          <button
                            id={`asset-search-result-${index}`}
                            key={`${result.provider}-${result.identifier}`}
                            type="button"
                            role="option"
                            aria-selected={index === activeSearchIndex}
                            className="asset-search__result"
                            onMouseEnter={() => setActiveSearchIndex(index)}
                            onClick={() => handleAddSearchResult(result)}
                          >
                            <span className="asset-search__result-name">{result.name}</span>
                            <span className="asset-search__result-meta">
                              {[result.identifier, result.type, result.exchange, result.currency, result.provider === "yahoo" ? "Yahoo Finance" : "Morningstar"].filter(Boolean).join(" · ")}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="asset-search__status">{dashboard.noSearchResults}</p>
                      )}
                    </div>
                  )}
                </div>

                {fundEntries.length > 0 && (
                  <div className="fund-entries">
                    {fundEntries.map((entry) => {
                      const fundName = fundNameMap.get(entry.isin) || entry.name;
                      const provider = funds.find((fund) => fund.isin === entry.isin)?.metadata?.provider || entry.provider;
                      return (
                        <div key={entry.isin} className="fund-entry">
                          <div className="fund-entry__info">
                            <span className="fund-entry__isin">{entry.isin}</span>
                            {fundName && <span className="fund-entry__name">{fundName}</span>}
                          </div>
                          <button
                            type="button"
                            className="fund-entry__remove"
                            onClick={() => handleRemoveEntry(entry.isin)}
                            title={dashboard.removeTitle}
                            aria-label={`${dashboard.removeTitle}: ${entry.isin}`}
                          >
                            ×
                          </button>
                          {provider && (
                            <span className="fund-entry__source">
                              {dashboard.sourceLabel}: {provider === "yahoo" ? "Yahoo Finance" : "Morningstar"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="input-bar__actions">
                  <p id="fund-input-feedback" className="input-bar__hint" aria-live="polite">
                    {fundEntries.length
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
                <RangeSelector language={language} rangeKey={rangeKey} onSelect={setRangeKey} />
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

          {hasResults ? <p className="analysis-disclosure">{dashboard.returnDisclosure}</p> : null}

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
                    loading={loading}
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
