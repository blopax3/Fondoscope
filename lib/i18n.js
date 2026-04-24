const LANGUAGE_CONFIG = {
  es: {
    htmlLang: "es",
    locale: "es-ES",
    metadataDescription: "Histórico interactivo de fondos de inversión por ISIN",
    dashboard: {
      subtitle: "Consulta y compara fondos de inversión por ISIN",
      placeholder: "Introduce ISINs — uno por línea, separados por comas o espacios",
      removeTitle: "Eliminar",
      maxFundsHint: (maxFunds, overflowCount) =>
        `Máximo ${maxFunds} fondos · Se ignoran ${overflowCount} ISIN${overflowCount > 1 ? "s" : ""} adicional${overflowCount > 1 ? "es" : ""}`,
      selectedFundsHint: (count) =>
        `${count} fondo${count > 1 ? "s" : ""} · Selecciona la divisa de cada fondo`,
      emptyHint: "Separadores: línea, coma, espacio, punto y coma",
      loadingButton: "Cargando…",
      submitButton: "Consultar",
      loadError: "No se pudo cargar la información.",
      reloadError: "No se pudo recargar el fondo.",
      missingIsin: "Introduce al menos un ISIN válido.",
      errorSectionTitle: "ISINs con error",
      statsFunds: (count) => `${count} fondos`,
      statsErrors: (count) => `${count} err`,
    },
    loadingState: {
      eyebrow: "Cargando",
      lede: "Estamos preparando los datos historicos para esta vista. En cuanto lleguen, la interfaz se completa sola.",
    },
    viewSwitcher: {
      cards: "Vista por fondo",
      compare: "Comparar fondos",
    },
    fundCard: {
      eyebrow: "Fondo",
      latestValue: "Último valor",
      window: "Ventana",
      variation: "Variación",
      navLabel: "Valor liquidativo",
      noData: "N/D",
      noWindowData: "No hay datos para la ventana temporal seleccionada.",
      updating: "Actualizando datos...",
    },
    comparisonChart: {
      eyebrow: "Comparador",
      lede: "Selecciona los fondos que quieres superponer. Cada línea muestra la variación porcentual acumulada desde el inicio del rango activo.",
      empty: "Selecciona al menos un fondo con datos para mostrar la comparativa.",
      updating: "Actualizando comparador...",
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
    metadataDescription: "Interactive investment fund history by ISIN",
    dashboard: {
      subtitle: "Look up and compare investment funds by ISIN",
      placeholder: "Enter ISINs — one per line, separated by commas or spaces",
      removeTitle: "Remove",
      maxFundsHint: (maxFunds, overflowCount) =>
        `Maximum ${maxFunds} funds · Ignoring ${overflowCount} extra ISIN${overflowCount > 1 ? "s" : ""}`,
      selectedFundsHint: (count) =>
        `${count} fund${count > 1 ? "s" : ""} · Select a currency for each fund`,
      emptyHint: "Separators: newline, comma, space, semicolon",
      loadingButton: "Loading…",
      submitButton: "Load funds",
      loadError: "Could not load the data.",
      reloadError: "Could not reload the fund.",
      missingIsin: "Enter at least one valid ISIN.",
      errorSectionTitle: "ISINs with errors",
      statsFunds: (count) => `${count} funds`,
      statsErrors: (count) => `${count} errors`,
    },
    loadingState: {
      eyebrow: "Loading",
      lede: "We are preparing the historical data for this view. The interface will fill in automatically as soon as it arrives.",
    },
    viewSwitcher: {
      cards: "Fund view",
      compare: "Compare funds",
    },
    fundCard: {
      eyebrow: "Fund",
      latestValue: "Latest value",
      window: "Window",
      variation: "Change",
      navLabel: "NAV",
      noData: "N/A",
      noWindowData: "No data is available for the selected time window.",
      updating: "Refreshing data...",
    },
    comparisonChart: {
      eyebrow: "Comparator",
      lede: "Choose which funds to overlay. Each line shows the cumulative percentage change since the start of the active range.",
      empty: "Select at least one fund with data to display the comparison.",
      updating: "Refreshing comparison...",
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
