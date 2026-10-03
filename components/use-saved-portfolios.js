"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeFundEntry, MAX_FUND_ENTRIES, RANGE_OPTIONS } from "../lib/fund-data";

const STORAGE_KEY = "fondoscope.savedPortfolios.v1";

function normalizePortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== "object") {
    return null;
  }

  const name = typeof portfolio.name === "string" ? portfolio.name.trim() : "";
  const entries = Array.isArray(portfolio.entries)
    ? portfolio.entries.map(normalizeFundEntry).filter(Boolean)
    : [];

  if (!name || !entries.length || entries.length !== portfolio.entries.length || entries.length > MAX_FUND_ENTRIES) {
    return null;
  }

  return {
    id: typeof portfolio.id === "string" ? portfolio.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    entries,
    rangeKey: RANGE_OPTIONS.some((option) => option.key === portfolio.rangeKey) ? portfolio.rangeKey : "1Y",
    commonPeriod: portfolio.commonPeriod !== false,
    createdAt: typeof portfolio.createdAt === "string" ? portfolio.createdAt : new Date().toISOString(),
  };
}

export function useSavedPortfolios() {
  const [portfolios, setPortfolios] = useState([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      setPortfolios(parsed.map(normalizePortfolio).filter(Boolean));
    } catch {
      setPortfolios([]);
    }
  }, []);

  const persist = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return false;
    }
    setPortfolios(next);
    return true;
  }, []);

  const savePortfolio = useCallback((name, entries, rangeKey = "1Y", commonPeriod = true) => {
    const trimmedName = (name || "").trim();
    if (!trimmedName || !Array.isArray(entries) || !entries.length) {
      return false;
    }

    const cleanEntries = entries.map(normalizeFundEntry).filter(Boolean);

    if (!cleanEntries.length || cleanEntries.length !== entries.length || cleanEntries.length > MAX_FUND_ENTRIES) {
      return false;
    }

    const normalizedName = trimmedName.toLowerCase();

    const next = [...portfolios];
    const existingIndex = next.findIndex((item) => item.name.toLowerCase() === normalizedName);
    const record = {
      id: existingIndex >= 0 ? next[existingIndex].id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedName,
      entries: cleanEntries,
      rangeKey,
      commonPeriod,
      createdAt: existingIndex >= 0 ? next[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      next[existingIndex] = record;
    } else {
      next.unshift(record);
    }

    return persist(next);
  }, [persist, portfolios]);

  const removePortfolio = useCallback((id) => {
    return persist(portfolios.filter((item) => item.id !== id));
  }, [persist, portfolios]);

  return useMemo(() => ({
    portfolios,
    savePortfolio,
    removePortfolio,
  }), [portfolios, removePortfolio, savePortfolio]);
}
