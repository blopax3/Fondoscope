const LANGUAGE_CONFIG = {
  es: {
    htmlLang: "es",
    locale: "es-ES",
    metadataDescription: "Histórico de fondos, acciones y ETF por ISIN o símbolo de Yahoo Finance",
    dashboard: {
      subtitle: "Consulta y compara fondos, acciones y ETF",
      loadSectionTitle: "Carga de activos",
      loadSectionDescription: "Introduce juntos ISIN de fondos o símbolos de Yahoo Finance.",
      identifierLabel: "ISIN o símbolos de Yahoo Finance",
      currencyLabel: "Divisa",
      sourceLabel: "Fuente",
      invalidIdentifiers: "Identificadores no válidos (introduce un ISIN o símbolo, no una URL)",
      placeholder: "Ej.: IE00B4L5Y983, AAPL, VWCE.DE",
      removeTitle: "Eliminar",
      maxFundsHint: (maxFunds, overflowCount) =>
        `Máximo ${maxFunds} activos · Elimina ${overflowCount} entrad${overflowCount > 1 ? "as" : "a"} para continuar`,
      selectedFundsHint: (count) =>
        `${count} entrad${count > 1 ? "as" : "a"} · Revisa la divisa de cada activo`,
      emptyHint: "Separa los identificadores con una línea, coma, espacio o punto y coma. Los símbolos se consultan en Yahoo Finance.",
      loadingButton: "Cargando…",
      submitButton: "Consultar",
      saveComparisonButton: "Guardar comparación",
      loadPortfolioButton: "Cargar",
      deletePortfolioButton: "Eliminar",
      savePortfolioLabel: "Guardar actual",
      portfolioNamePlaceholder: "Nombre de cartera (opcional)",
      portfolioSectionLabel: "Carteras guardadas",
      portfolioSectionDescription: "Guarda combinaciones frecuentes y recárgalas sin volver a introducir los identificadores.",
      savedPortfoliosLabel: "Guardadas",
      savedPortfoliosCount: (count) => `${count} cartera${count > 1 ? "s" : ""}`,
      portfolioListEmpty: "Aún no hay carteras guardadas.",
      portfolioFundCount: (count) => `${count} activo${count > 1 ? "s" : ""}`,
      defaultPortfolioName: "Cartera",
      portfolioSaveError: "No se pudo guardar la cartera local.",
      portfolioMissingSelection: "Selecciona una cartera para cargar.",
      loadError: "No se pudo cargar la información.",
      reloadError: "No se pudo recargar el fondo.",
      missingIsin: "Introduce al menos un ISIN o símbolo de Yahoo válido.",
      errorSectionTitle: "Entradas con error",
      analysisEmptyTitle: "Visualización pendiente",
      analysisEmptyDescription: "La zona de gráficos y comparación aparecerá aquí cuando cargues al menos un fondo.",
      themeToggleLabel: (targetTheme) =>
        targetTheme === "light" ? "Cambiar a tema claro" : "Cambiar a tema oscuro",
      themeToggleShort: (targetTheme) =>
        targetTheme === "light" ? "Tema claro" : "Tema oscuro",
      statsFunds: (count) => `${count} activos`,
      statsErrors: (count) => `${count} err`,
      shareButton: "Compartir comparación",
      shareSuccess: "Enlace copiado",
      shareError: "No se pudo copiar el enlace.",
      returnDisclosure: "Las variaciones comparan precio o valor liquidativo. Los datos de Yahoo Finance no incluyen dividendos.",
    },
    loadingState: {
      eyebrow: "Cargando",
      lede: "Estamos preparando los datos historicos para esta vista. En cuanto lleguen, la interfaz se completa sola.",
    },
    viewSwitcher: {
      label: "Modo de visualización",
      cards: "Vista por fondo",
      compare: "Comparar fondos",
    },
    rangeSelector: {
      label: "Periodo de análisis",
    },
    fundCard: {
      eyebrow: "Activo",
      latestValue: "Último valor",
      window: "Ventana",
      variation: "Variación",
      navLabel: "Valor liquidativo",
      noData: "N/D",
      noWindowData: "No hay datos para la ventana temporal seleccionada.",
      updating: "Actualizando datos...",
      currencyLabel: "Divisa",
      updatedThrough: (date) => `datos hasta ${date}`,
      chartLabel: (name, range) => `Histórico de ${name} para el periodo ${range}`,
    },
    comparisonChart: {
      eyebrow: "Comparador",
      lede: "Selecciona los fondos que quieres superponer. Cada línea muestra la variación porcentual acumulada desde el inicio del rango activo.",
      empty: "Selecciona al menos un fondo con datos para mostrar la comparativa.",
      updating: "Actualizando comparador...",
      chartLabel: "Comparación de rentabilidad por precio o valor liquidativo",
    },
    comparisonTable: {
      eyebrow: "Tabla comparativa",
      metric: "Métrica",
    },
    correlation: {
      eyebrow: "Correlación",
      negative: "Negativa",
      neutral: "Neutra",
      positive: "Positiva",
      fund: "Fondo",
      noData: "N/D",
      insufficientData: "sin datos suficientes",
      autocorrelation: "autocorrelacion",
      almostNull: "casi nula",
      weakPositive: "positiva debil",
      weakNegative: "negativa debil",
      moderatePositive: "positiva moderada",
      moderateNegative: "negativa moderada",
      strongPositive: "positiva fuerte",
      strongNegative: "negativa fuerte",
      veryStrongPositive: "positiva muy fuerte",
      veryStrongNegative: "negativa muy fuerte",
      sharedIntervals: (count) => `${count} intervalos compartidos`,
    },
    metrics: {
      notAvailable: "N/D",
      notRecovered: "Sin recuperar",
      dayUnit: "d",
      monthUnit: "m",
      yearUnit: "a",
      note: (periodLabel) =>
        `Las metricas del periodo ${periodLabel} se anclan a la ultima fecha comun disponible entre los fondos comparados. Si no existe dato exacto en un borde, usan la observacion mas cercana dentro de una tolerancia de 7 dias y, si un fondo no cubre todo el rango, aprovechan el tramo disponible dentro de esa ventana.`,
      profitability: "Rentabilidad",
      risk: "Riesgo",
      context: "Contexto",
      accumulatedReturn: (periodLabel) => `Rentabilidad acumulada · ${periodLabel}`,
      annualizedReturn: (periodLabel) => `Rentabilidad anualizada · ${periodLabel}`,
      cagrFullHistory: "CAGR · historico completo",
      ytdReturn: "Rentabilidad acumulada · YTD",
      observations: (periodLabel) => `Observaciones disponibles · ${periodLabel}`,
      historyAge: "Antiguedad del historico",
      maxDrawdownFullHistory: "Maximo drawdown · historico completo",
      mddRecoveryFullHistory: "Recuperacion del MDD · historico completo",
      annualizedVolatility: (periodLabel) => `Volatilidad anualizada · ${periodLabel}`,
      maxDrawdown: (periodLabel) => `Maximo drawdown · ${periodLabel}`,
      returnToVolatility: (periodLabel) => `Ratio retorno/volatilidad · ${periodLabel}`,
      mddRecovery: (periodLabel) => `Recuperacion del MDD · ${periodLabel}`,
    },
    api: {
      invalidPythonResponse: "La funcion Python devolvio una respuesta no valida.",
      historyFetchFailed: "No se pudo obtener el histórico de los fondos.",
      invalidApiHtml: "La API devolvio HTML en vez de JSON. Revisa el error del servidor en /api/funds.",
      invalidApiResponse: "La API devolvio una respuesta no valida.",
      loadInfoFailed: "No se pudo cargar la información.",
    },
  },
  en: {
    htmlLang: "en",
    locale: "en-US",
    metadataDescription: "Fund, stock, and ETF history by ISIN or Yahoo Finance symbol",
    dashboard: {
      subtitle: "Look up and compare funds, stocks, and ETFs",
      loadSectionTitle: "Asset input",
      loadSectionDescription: "Enter fund ISINs and Yahoo Finance symbols together.",
      identifierLabel: "ISINs or Yahoo Finance symbols",
      currencyLabel: "Currency",
      sourceLabel: "Source",
      invalidIdentifiers: "Invalid identifiers (enter an ISIN or symbol, not a URL)",
      placeholder: "E.g. IE00B4L5Y983, AAPL, VWCE.DE",
      removeTitle: "Remove",
      maxFundsHint: (maxFunds, overflowCount) =>
        `Maximum ${maxFunds} assets · Remove ${overflowCount} entr${overflowCount > 1 ? "ies" : "y"} to continue`,
      selectedFundsHint: (count) =>
        `${count} entr${count > 1 ? "ies" : "y"} · Check the currency for each asset`,
      emptyHint: "Separate identifiers with a newline, comma, space, or semicolon. Symbols are looked up on Yahoo Finance.",
      loadingButton: "Loading…",
      submitButton: "Load funds",
      saveComparisonButton: "Save comparison",
      loadPortfolioButton: "Load",
      deletePortfolioButton: "Delete",
      savePortfolioLabel: "Save current",
      portfolioNamePlaceholder: "Portfolio name (optional)",
      portfolioSectionLabel: "Saved portfolios",
      portfolioSectionDescription: "Store frequent combinations and load them again without re-entering the identifiers.",
      savedPortfoliosLabel: "Saved",
      savedPortfoliosCount: (count) => `${count} portfolio${count > 1 ? "s" : ""}`,
      portfolioListEmpty: "No saved portfolios yet.",
      portfolioFundCount: (count) => `${count} asset${count > 1 ? "s" : ""}`,
      defaultPortfolioName: "Portfolio",
      portfolioSaveError: "Could not save the local portfolio.",
      portfolioMissingSelection: "Select a portfolio to load.",
      loadError: "Could not load the data.",
      reloadError: "Could not reload the fund.",
      missingIsin: "Enter at least one valid ISIN or Yahoo Finance symbol.",
      errorSectionTitle: "Entries with errors",
      analysisEmptyTitle: "Visualization pending",
      analysisEmptyDescription: "Charts and comparison views will appear here once you load at least one fund.",
      themeToggleLabel: (targetTheme) =>
        targetTheme === "light" ? "Switch to light theme" : "Switch to dark theme",
      themeToggleShort: (targetTheme) =>
        targetTheme === "light" ? "Light theme" : "Dark theme",
      statsFunds: (count) => `${count} assets`,
      statsErrors: (count) => `${count} errors`,
      shareButton: "Share comparison",
      shareSuccess: "Link copied",
      shareError: "Could not copy the link.",
      returnDisclosure: "Changes compare price or NAV. Yahoo Finance data does not include dividends.",
    },
    loadingState: {
      eyebrow: "Loading",
      lede: "We are preparing the historical data for this view. The interface will fill in automatically as soon as it arrives.",
    },
    viewSwitcher: {
      label: "Display mode",
      cards: "Fund view",
      compare: "Compare funds",
    },
    rangeSelector: {
      label: "Analysis period",
    },
    fundCard: {
      eyebrow: "Asset",
      latestValue: "Latest value",
      window: "Window",
      variation: "Change",
      navLabel: "NAV",
      noData: "N/A",
      noWindowData: "No data is available for the selected time window.",
      updating: "Refreshing data...",
      currencyLabel: "Currency",
      updatedThrough: (date) => `data through ${date}`,
      chartLabel: (name, range) => `${name} history for the ${range} period`,
    },
    comparisonChart: {
      eyebrow: "Comparator",
      lede: "Choose which funds to overlay. Each line shows the cumulative percentage change since the start of the active range.",
      empty: "Select at least one fund with data to display the comparison.",
      updating: "Refreshing comparison...",
      chartLabel: "Price or NAV return comparison",
    },
    comparisonTable: {
      eyebrow: "Comparison table",
      metric: "Metric",
    },
    correlation: {
      eyebrow: "Correlation",
      negative: "Negative",
      neutral: "Neutral",
      positive: "Positive",
      fund: "Fund",
      noData: "N/A",
      insufficientData: "not enough data",
      autocorrelation: "autocorrelation",
      almostNull: "near zero",
      weakPositive: "weak positive",
      weakNegative: "weak negative",
      moderatePositive: "moderate positive",
      moderateNegative: "moderate negative",
      strongPositive: "strong positive",
      strongNegative: "strong negative",
      veryStrongPositive: "very strong positive",
      veryStrongNegative: "very strong negative",
      sharedIntervals: (count) => `${count} shared intervals`,
    },
    metrics: {
      notAvailable: "N/A",
      notRecovered: "Not recovered",
      dayUnit: "d",
      monthUnit: "mo",
      yearUnit: "y",
      note: (periodLabel) =>
        `Metrics for ${periodLabel} are anchored to the latest common date available across the compared funds. If there is no exact observation on a boundary, the nearest observation within a 7-day tolerance is used, and if a fund does not cover the full range, the available slice inside that window is used instead.`,
      profitability: "Performance",
      risk: "Risk",
      context: "Context",
      accumulatedReturn: (periodLabel) => `Cumulative return · ${periodLabel}`,
      annualizedReturn: (periodLabel) => `Annualized return · ${periodLabel}`,
      cagrFullHistory: "CAGR · full history",
      ytdReturn: "Cumulative return · YTD",
      observations: (periodLabel) => `Available observations · ${periodLabel}`,
      historyAge: "History coverage",
      maxDrawdownFullHistory: "Max drawdown · full history",
      mddRecoveryFullHistory: "MDD recovery · full history",
      annualizedVolatility: (periodLabel) => `Annualized volatility · ${periodLabel}`,
      maxDrawdown: (periodLabel) => `Max drawdown · ${periodLabel}`,
      returnToVolatility: (periodLabel) => `Return/volatility ratio · ${periodLabel}`,
      mddRecovery: (periodLabel) => `MDD recovery · ${periodLabel}`,
    },
    api: {
      invalidPythonResponse: "The Python function returned an invalid response.",
      historyFetchFailed: "Could not fetch the fund history.",
      invalidApiHtml: "The API returned HTML instead of JSON. Check the server error in /api/funds.",
      invalidApiResponse: "The API returned an invalid response.",
      loadInfoFailed: "Could not load the data.",
    },
  },
};

export function normalizeLanguage(language) {
  return typeof language === "string" && language.toLowerCase().startsWith("es") ? "es" : "en";
}

export function resolveRequestLanguage(acceptLanguage = "") {
  if (typeof acceptLanguage !== "string" || !acceptLanguage.trim()) {
    return "en";
  }

  const requestedLanguages = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const value of requestedLanguages) {
    if (value.startsWith("es")) {
      return "es";
    }

    if (value.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

export function getI18n(language) {
  return LANGUAGE_CONFIG[normalizeLanguage(language)];
}

export function getIntlLocale(language) {
  return getI18n(language).locale;
}
