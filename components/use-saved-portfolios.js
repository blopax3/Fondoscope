"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fondoscope.savedPortfolios.v1";

function normalizePortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== "object") {
    return null;
  }

  const name = typeof portfolio.name === "string" ? portfolio.name.trim() : "";
  const entries = Array.isArray(portfolio.entries)
    ? portfolio.entries
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const isin = typeof entry.isin === "string" ? entry.isin.trim().toUpperCase() : "";
        const currency = typeof entry.currency === "string" ? entry.currency.trim().toUpperCase() : "EUR";
        if (!isin) {
          return null;
        }

        return { isin, currency: currency || "EUR" };
      })
      .filter(Boolean)
    : [];

  if (!name || !entries.length) {
    return null;
  }

  return {
    id: typeof portfolio.id === "string" ? portfolio.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    entries,
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
    setPortfolios(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage might be unavailable or full
    }
  }, []);

  const savePortfolio = useCallback((name, entries) => {
    const trimmedName = (name || "").trim();
    if (!trimmedName || !Array.isArray(entries) || !entries.length) {
      return false;
    }

    const cleanEntries = entries
      .map((entry) => ({
        isin: String(entry?.isin || "").trim().toUpperCase(),
        currency: String(entry?.currency || "EUR").trim().toUpperCase() || "EUR",
      }))
      .filter((entry) => entry.isin);

    if (!cleanEntries.length) {
      return false;
    }

    const normalizedName = trimmedName.toLowerCase();

    const next = [...portfolios];
    const existingIndex = next.findIndex((item) => item.name.toLowerCase() === normalizedName);
    const record = {
      id: existingIndex >= 0 ? next[existingIndex].id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedName,
      entries: cleanEntries,
      createdAt: existingIndex >= 0 ? next[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      next[existingIndex] = record;
    } else {
      next.unshift(record);
    }

    persist(next);
    return true;
  }, [persist, portfolios]);

  const removePortfolio = useCallback((id) => {
    persist(portfolios.filter((item) => item.id !== id));
  }, [persist, portfolios]);

  return useMemo(() => ({
    portfolios,
    savePortfolio,
    removePortfolio,
  }), [portfolios, removePortfolio, savePortfolio]);
}
