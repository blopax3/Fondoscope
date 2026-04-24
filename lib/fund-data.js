import { getI18n, getIntlLocale } from "./i18n";

export const RANGE_OPTIONS = [
  { key: "1M", label: "1M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
  { key: "3Y", label: "3Y" },
  { key: "5Y", label: "5Y" },
  { key: "YTD", label: "YTD" },
  { key: "MAX", label: "MAX" },
];

export const FUND_COLORS = ["#00c896", "#5b8def", "#f0c05a", "#e84855", "#a78bfa", "#f472b6"];
export const MAX_FUND_ENTRIES = 8;

export function parseIsins(value, limit = Infinity) {
  return [...new Set(
    value
      .split(/[\n,;\s]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  )].slice(0, limit);
}

export function getFundLabel(fund) {
  return fund.name || fund.isin;
}

export function getFundDisplayName(fund) {
  const label = getFundLabel(fund);
  return label === fund.isin ? fund.isin : `${label} (${fund.isin})`;
}

export function formatDateLabel(value, language = "en") {
  return new Intl.DateTimeFormat(getIntlLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCompactDate(value, language = "en") {
  return new Intl.DateTimeFormat(getIntlLocale(language), {
    month: "short",
    year: "2-digit",
  }).format(new Date(value));
}

export function formatPrice(value, currency = "", language = "en") {
  if (currency) {
    return new Intl.NumberFormat(getIntlLocale(language), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat(getIntlLocale(language), {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value, maximumFractionDigits = 0, language = "en") {
  return new Intl.NumberFormat(getIntlLocale(language), {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value, maximumFractionDigits = 2, language = "en") {
  return new Intl.NumberFormat(getIntlLocale(language), {
    style: "percent",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
    signDisplay: "exceptZero",
  }).format(value / 100);
}

function createDateWithClampedDay(date, nextYear, nextMonth) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const lastDayOfTargetMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextDay = Math.min(date.getDate(), lastDayOfTargetMonth);

  return new Date(nextYear, nextMonth, nextDay, hours, minutes, seconds, milliseconds);
}

function shiftCalendarDate(date, amount, unit) {
  if (unit === "months") {
    const totalMonths = (date.getFullYear() * 12) + date.getMonth() + amount;
    const nextYear = Math.floor(totalMonths / 12);
    const nextMonth = ((totalMonths % 12) + 12) % 12;
    return createDateWithClampedDay(date, nextYear, nextMonth);
  }

  return createDateWithClampedDay(date, date.getFullYear() + amount, date.getMonth());
}

export function getRangeStart(lastDate, rangeKey) {
  const anchor = new Date(lastDate);

  switch (rangeKey) {
    case "1M":
      return shiftCalendarDate(anchor, -1, "months");
    case "6M":
      return shiftCalendarDate(anchor, -6, "months");
    case "1Y":
      return shiftCalendarDate(anchor, -1, "years");
    case "3Y":
      return shiftCalendarDate(anchor, -3, "years");
    case "5Y":
      return shiftCalendarDate(anchor, -5, "years");
    case "YTD":
      return new Date(anchor.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export function filterSeries(series, rangeKey, endDate = null) {
  if (!series.length) {
    return series;
  }

  const effectiveEndDate = endDate ?? series[series.length - 1].date;
  const maxDate = new Date(effectiveEndDate);

  if (rangeKey === "MAX") {
    return series.filter((point) => new Date(point.date) <= maxDate);
  }

  const startDate = getRangeStart(effectiveEndDate, rangeKey);
  if (!startDate) {
    return series.filter((point) => new Date(point.date) <= maxDate);
  }

  return series.filter((point) => {
    const pointDate = new Date(point.date);
    return pointDate >= startDate && pointDate <= maxDate;
  });
}

export function computeChange(series) {
  if (series.length < 2) {
    return null;
  }

  const first = series[0].price;
  const last = series[series.length - 1].price;
  const absolute = last - first;
  const percent = first === 0 ? null : (absolute / first) * 100;

  return { absolute, percent };
}

export function buildComparisonSeries(funds, selectedFunds, rangeKey) {
  const visibleFunds = funds.filter((fund) => selectedFunds.includes(fund.isin));
  if (!visibleFunds.length) {
    return [];
  }

  const comparisonEndDate = getCommonComparisonEndDate(visibleFunds);

  const timeline = new Map();

  visibleFunds.forEach((fund) => {
    const filtered = filterSeries(fund.history, rangeKey, comparisonEndDate);
    if (!filtered.length) {
      return;
    }

    const base = filtered[0].price;
    filtered.forEach((point) => {
      const existing = timeline.get(point.date) ?? { date: point.date };
      existing[fund.isin] = base === 0 ? null : ((point.price / base) - 1) * 100;
      timeline.set(point.date, existing);
    });
  });

  return [...timeline.values()].sort((left, right) => new Date(left.date) - new Date(right.date));
}

const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.25;
const TRADING_DAYS_PER_YEAR = 252;
const DATE_MATCH_TOLERANCE_DAYS = 7;
const MIN_ANNUALIZED_WINDOW_DAYS = 180;
const MIN_CORRELATION_INTERVALS = 3;

function normalizeRangeKey(rangeKey, fallback = "1Y") {
  return RANGE_OPTIONS.some((option) => option.key === rangeKey) ? rangeKey : fallback;
}

function addPeriod(date, amount, unit) {
  return shiftCalendarDate(date, amount, unit);
}

function getTrailingRangeStart(endDate, rangeKey) {
  const anchor = new Date(endDate);

  switch (rangeKey) {
    case "1M":
      return addPeriod(anchor, -1, "months");
    case "6M":
      return addPeriod(anchor, -6, "months");
    case "3M":
      return addPeriod(anchor, -3, "months");
    case "YTD":
      return new Date(anchor.getFullYear(), 0, 1);
    case "1Y":
      return addPeriod(anchor, -1, "years");
    case "3Y":
      return addPeriod(anchor, -3, "years");
    case "5Y":
      return addPeriod(anchor, -5, "years");
    case "10Y":
      return addPeriod(anchor, -10, "years");
    default:
      return null;
  }
}

function getTimestamp(value) {
  return new Date(value).getTime();
}

function getDayDistance(start, end) {
  return Math.max(0, (getTimestamp(end) - getTimestamp(start)) / CALENDAR_DAY_MS);
}

function getAbsoluteDayDistance(start, end) {
  return Math.abs(getTimestamp(end) - getTimestamp(start)) / CALENDAR_DAY_MS;
}

function getYearDistance(start, end) {
  return getDayDistance(start, end) / DAYS_PER_YEAR;
}

function findPointOnOrBefore(series, targetDate) {
  let candidate = null;

  for (let index = 0; index < series.length; index += 1) {
    const point = series[index];

    if (getTimestamp(point.date) <= targetDate.getTime()) {
      candidate = point;
      continue;
    }

    break;
  }

  return candidate;
}

function findPointOnOrAfter(series, targetDate) {
  for (let index = 0; index < series.length; index += 1) {
    const point = series[index];

    if (getTimestamp(point.date) >= targetDate.getTime()) {
      return point;
    }
  }

  return null;
}

function isWithinDateTolerance(point, targetDate, toleranceDays = DATE_MATCH_TOLERANCE_DAYS) {
  return point ? getAbsoluteDayDistance(point.date, targetDate) <= toleranceDays : false;
}

function resolveBoundaryPoint(series, targetDate, toleranceDays = DATE_MATCH_TOLERANCE_DAYS) {
  if (!series.length) {
    return null;
  }

  const before = findPointOnOrBefore(series, targetDate);
  if (isWithinDateTolerance(before, targetDate, toleranceDays)) {
    return before;
  }

  const after = findPointOnOrAfter(series, targetDate);
  if (isWithinDateTolerance(after, targetDate, toleranceDays)) {
    return after;
  }

  return null;
}

function getBoundaryDistance(point, targetDate) {
  return point ? getAbsoluteDayDistance(point.date, targetDate) : Number.POSITIVE_INFINITY;
}

function resolveBoundaryPointWithPreference(
  series,
  targetDate,
  {
    toleranceDays = DATE_MATCH_TOLERANCE_DAYS,
    preference = "nearest",
  } = {}
) {
  const before = findPointOnOrBefore(series, targetDate);
  const after = findPointOnOrAfter(series, targetDate);
  const beforeIsValid = isWithinDateTolerance(before, targetDate, toleranceDays);
  const afterIsValid = isWithinDateTolerance(after, targetDate, toleranceDays);

  if (preference === "before") {
    if (beforeIsValid) {
      return before;
    }

    return afterIsValid ? after : null;
  }

  if (preference === "after") {
    if (afterIsValid) {
      return after;
    }

    return beforeIsValid ? before : null;
  }

  if (beforeIsValid && afterIsValid) {
    return getBoundaryDistance(before, targetDate) <= getBoundaryDistance(after, targetDate)
      ? before
      : after;
  }

  if (beforeIsValid) {
    return before;
  }

  return afterIsValid ? after : null;
}

export function getCommonComparisonEndDate(funds) {
  const latestDates = funds
    .map((fund) => fund.history?.[fund.history.length - 1]?.date)
    .filter(Boolean);

  if (!latestDates.length) {
    return null;
  }

  return latestDates.reduce((earliest, current) =>
    new Date(current) < new Date(earliest) ? current : earliest
  );
}

function computePercentChange(startPrice, endPrice) {
  if (!(startPrice > 0) || !Number.isFinite(endPrice)) {
    return null;
  }

  return ((endPrice / startPrice) - 1) * 100;
}

function computeAnnualizedReturn(startPoint, endPoint) {
  if (!startPoint || !endPoint) {
    return null;
  }

  const years = getYearDistance(startPoint.date, endPoint.date);
  if (!(years > 0) || !(startPoint.price > 0) || !(endPoint.price > 0)) {
    return null;
  }

  return (Math.pow(endPoint.price / startPoint.price, 1 / years) - 1) * 100;
}

function getPeriodWindow(series, rangeKey = null, endDate = null) {
  if (series.length < 2) {
    return null;
  }

  if (rangeKey && rangeKey !== "MAX") {
    return getTrailingWindow(series, rangeKey, endDate);
  }

  const endPoint = endDate
    ? resolveBoundaryPoint(series, new Date(endDate))
    : series[series.length - 1];
  const startPoint = series[0];

  if (!endPoint || getTimestamp(startPoint.date) >= getTimestamp(endPoint.date)) {
    return null;
  }

  return { startPoint, endPoint };
}

function getSeriesSliceBetween(series, startDate, endDate) {
  const startTimestamp = getTimestamp(startDate);
  const endTimestamp = getTimestamp(endDate);

  return series.filter((point) => (
    getTimestamp(point.date) >= startTimestamp
    && getTimestamp(point.date) <= endTimestamp
  ));
}

function getComparisonMetricWindow(series, rangeKey = null, endDate = null) {
  if (series.length < 2) {
    return null;
  }

  if (!rangeKey || rangeKey === "MAX") {
    const endPoint = endDate
      ? resolveBoundaryPointWithPreference(series, new Date(endDate), { preference: "before" })
      : series[series.length - 1];
    const startPoint = series[0];

    if (!endPoint || getTimestamp(startPoint.date) >= getTimestamp(endPoint.date)) {
      return null;
    }

    const periodSeries = getSeriesSliceBetween(series, startPoint.date, endPoint.date);

    return periodSeries.length >= 2 ? { startPoint, endPoint, periodSeries } : null;
  }

  const anchorDate = new Date(endDate ?? series[series.length - 1].date);
  const endPoint = endDate
    ? resolveBoundaryPointWithPreference(series, anchorDate, { preference: "before" })
    : series[series.length - 1];

  if (!endPoint) {
    return null;
  }

  const startDate = getTrailingRangeStart(anchorDate, rangeKey);
  if (!startDate) {
    return null;
  }

  const startPoint = startDate <= new Date(series[0].date)
    ? series[0]
    : resolveBoundaryPointWithPreference(series, startDate, { preference: "nearest" });
  if (!startPoint || getTimestamp(startPoint.date) >= getTimestamp(endPoint.date)) {
    return null;
  }

  const periodSeries = getSeriesSliceBetween(series, startPoint.date, endPoint.date);

  return periodSeries.length >= 2 ? { startPoint, endPoint, periodSeries } : null;
}

function getTrailingWindow(series, rangeKey, endDate = null) {
  if (series.length < 2) {
    return null;
  }

  const anchorDate = new Date(endDate ?? series[series.length - 1].date);
  const endPoint = resolveBoundaryPoint(series, anchorDate);

  if (!endPoint) {
    return null;
  }

  const startDate = getTrailingRangeStart(anchorDate, rangeKey);
  if (!startDate) {
    return null;
  }

  if (
    startDate < new Date(series[0].date) &&
    !isWithinDateTolerance(series[0], startDate)
  ) {
    return null;
  }

  const startPoint = resolveBoundaryPoint(series, startDate);
  if (!startPoint || getTimestamp(startPoint.date) >= getTimestamp(endPoint.date)) {
    return null;
  }

  return { startPoint, endPoint };
}

export function computeTrailingReturn(series, rangeKey, endDate = null) {
  const window = getTrailingWindow(series, rangeKey, endDate);

  if (!window) {
    return null;
  }

  return computePercentChange(window.startPoint.price, window.endPoint.price);
}

function getDailyReturns(series) {
  const returns = [];

  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];

    if (!(previous.price > 0) || !(current.price > 0)) {
      continue;
    }

    returns.push((current.price / previous.price) - 1);
  }

  return returns;
}

function computeMean(values) {
  if (!values.length) {
    return null;
  }

  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function computeSampleDeviation(values) {
  if (values.length < 2) {
    return null;
  }

  const mean = computeMean(values);
  const variance =
    values.reduce((acc, value) => acc + ((value - mean) ** 2), 0) / (values.length - 1);

  return Math.sqrt(variance);
}

function computePearsonCorrelation(valuesA, valuesB) {
  if (valuesA.length !== valuesB.length || valuesA.length < 2) {
    return null;
  }

  const meanA = computeMean(valuesA);
  const meanB = computeMean(valuesB);

  let numerator = 0;
  let squaredDistanceA = 0;
  let squaredDistanceB = 0;

  for (let index = 0; index < valuesA.length; index += 1) {
    const distanceA = valuesA[index] - meanA;
    const distanceB = valuesB[index] - meanB;
    numerator += distanceA * distanceB;
    squaredDistanceA += distanceA ** 2;
    squaredDistanceB += distanceB ** 2;
  }

  if (!(squaredDistanceA > 0) || !(squaredDistanceB > 0)) {
    return null;
  }

  const correlation = numerator / Math.sqrt(squaredDistanceA * squaredDistanceB);
  return Math.max(-1, Math.min(1, correlation));
}

function computeSharedReturnSeries(leftSeries, rightSeries) {
  if (leftSeries.length < 2 || rightSeries.length < 2) {
    return { leftReturns: [], rightReturns: [], intervalCount: 0 };
  }

  const leftPriceByDate = new Map(leftSeries.map((point) => [point.date, point.price]));
  const rightPriceByDate = new Map(rightSeries.map((point) => [point.date, point.price]));
  const commonDates = leftSeries
    .map((point) => point.date)
    .filter((date) => rightPriceByDate.has(date));

  if (commonDates.length < 2) {
    return { leftReturns: [], rightReturns: [], intervalCount: 0 };
  }

  const leftReturns = [];
  const rightReturns = [];

  for (let index = 1; index < commonDates.length; index += 1) {
    const previousDate = commonDates[index - 1];
    const currentDate = commonDates[index];
    const previousLeftPrice = leftPriceByDate.get(previousDate);
    const currentLeftPrice = leftPriceByDate.get(currentDate);
    const previousRightPrice = rightPriceByDate.get(previousDate);
    const currentRightPrice = rightPriceByDate.get(currentDate);

    if (
      !(previousLeftPrice > 0)
      || !(currentLeftPrice > 0)
      || !(previousRightPrice > 0)
      || !(currentRightPrice > 0)
    ) {
      continue;
    }

    leftReturns.push((currentLeftPrice / previousLeftPrice) - 1);
    rightReturns.push((currentRightPrice / previousRightPrice) - 1);
  }

  return {
    leftReturns,
    rightReturns,
    intervalCount: leftReturns.length,
  };
}

function buildCorrelationCell(rowFund, columnFund, seriesByFund) {
  const rowSeries = seriesByFund.get(rowFund.isin) ?? [];
  const columnSeries = seriesByFund.get(columnFund.isin) ?? [];

  if (rowFund.isin === columnFund.isin) {
    const intervalCount = Math.max(rowSeries.length - 1, 0);
    return {
      value: intervalCount > 0 ? 1 : null,
      intervalCount,
    };
  }

  const { leftReturns, rightReturns, intervalCount } = computeSharedReturnSeries(rowSeries, columnSeries);

  if (intervalCount < MIN_CORRELATION_INTERVALS) {
    return {
      value: null,
      intervalCount,
    };
  }

  return {
    value: computePearsonCorrelation(leftReturns, rightReturns),
    intervalCount,
  };
}

function computeVolatility(series) {
  const dailyReturns = getDailyReturns(series);
  const deviation = computeSampleDeviation(dailyReturns);

  return deviation == null ? null : deviation * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
}

function computeMaxDrawdown(series) {
  if (series.length < 2) {
    return null;
  }

  let peakPrice = series[0].price;
  let peakIndex = 0;
  let maxDrawdown = 0;
  let maxDrawdownPeakIndex = 0;
  let troughIndex = 0;

  for (let index = 1; index < series.length; index += 1) {
    const point = series[index];

    if (point.price > peakPrice) {
      peakPrice = point.price;
      peakIndex = index;
    }

    const drawdown = ((point.price / peakPrice) - 1) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPeakIndex = peakIndex;
      troughIndex = index;
    }
  }

  const recoveryPrice = series[maxDrawdownPeakIndex]?.price;
  let recoveryIndex = maxDrawdown === 0 ? maxDrawdownPeakIndex : -1;

  if (maxDrawdown < 0 && recoveryPrice != null) {
    for (let index = troughIndex + 1; index < series.length; index += 1) {
      if (series[index].price >= recoveryPrice) {
        recoveryIndex = index;
        break;
      }
    }
  }

  return {
    value: maxDrawdown,
    peakIndex: maxDrawdownPeakIndex,
    troughIndex,
    recoveryIndex,
  };
}

function computeRecoveryStats(series) {
  const drawdown = computeMaxDrawdown(series);
  if (!drawdown) {
    return { available: false, recovered: false, days: null };
  }

  if (drawdown.value === 0) {
    return { available: true, recovered: true, days: 0 };
  }

  if (drawdown.recoveryIndex < 0) {
    return { available: true, recovered: false, days: null };
  }

  return {
    available: true,
    recovered: true,
    days: Math.round(
      getDayDistance(series[drawdown.peakIndex].date, series[drawdown.recoveryIndex].date)
    ),
  };
}

function computeYearsBetween(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  const years = getYearDistance(startDate, endDate);
  return years > 0 ? years : null;
}

function computePeriodAnnualizedReturn(series, rangeKey = null, endDate = null) {
  const window = getPeriodWindow(series, rangeKey, endDate);
  return computeAnnualizedReturnForWindow(window);
}

function computeAnnualizedReturnForWindow(window) {
  if (!window) {
    return null;
  }

  const days = getDayDistance(window.startPoint.date, window.endPoint.date);

  // Avoid extrapolating annualized returns from very short windows.
  if (!(days >= MIN_ANNUALIZED_WINDOW_DAYS)) {
    return null;
  }

  return computeAnnualizedReturn(window.startPoint, window.endPoint);
}

function computeReturnToVolatility(annualizedReturn, annualizedVolatility) {
  if (!Number.isFinite(annualizedReturn) || !Number.isFinite(annualizedVolatility) || annualizedVolatility === 0) {
    return null;
  }

  return annualizedReturn / annualizedVolatility;
}

function computeEndingCapital(periodReturnPercent, initialCapital = 10000) {
  if (!Number.isFinite(periodReturnPercent)) {
    return null;
  }

  return initialCapital * (1 + (periodReturnPercent / 100));
}

function createCell(text, tone = null) {
  return { text, tone };
}

function createPercentCell(value, language = "en", { digits = 2, tone = true } = {}) {
  const { metrics } = getI18n(language);

  if (!Number.isFinite(value)) {
    return createCell(metrics.notAvailable);
  }

  let toneValue = null;

  if (tone && value > 0) {
    toneValue = "positive";
  } else if (tone && value < 0) {
    toneValue = "negative";
  }

  return createCell(formatPercent(value, digits, language), toneValue);
}

function createPriceCell(value, currency = "", language = "en", { digits = 2, tone = false } = {}) {
  const { metrics } = getI18n(language);

  if (!Number.isFinite(value)) {
    return createCell(metrics.notAvailable);
  }

  let toneValue = null;
  if (tone && value > 0) {
    toneValue = "positive";
  } else if (tone && value < 0) {
    toneValue = "negative";
  }

  if (currency) {
    return createCell(formatPrice(value, currency, language), toneValue);
  }

  return createCell(formatNumber(value, digits, language), toneValue);
}

function createNumberCell(value, digits = 0, language = "en") {
  const { metrics } = getI18n(language);

  if (!Number.isFinite(value)) {
    return createCell(metrics.notAvailable);
  }

  return createCell(formatNumber(value, digits, language));
}

function createRatioCell(value, digits = 2, language = "en") {
  const { metrics } = getI18n(language);

  if (!Number.isFinite(value)) {
    return createCell(metrics.notAvailable);
  }

  return createCell(formatNumber(value, digits, language));
}

function createDurationCell(days, language = "en") {
  const { metrics } = getI18n(language);

  if (days == null) {
    return createCell(metrics.notAvailable);
  }

  if (days < 60) {
    return createCell(`${days} ${metrics.dayUnit}`);
  }

  if (days < 730) {
    return createCell(`${formatNumber(days / 30.44, 1, language)} ${metrics.monthUnit}`);
  }

  return createCell(`${formatNumber(days / DAYS_PER_YEAR, 1, language)} ${metrics.yearUnit}`);
}

function createRecoveryCell(stats, language = "en") {
  const { metrics } = getI18n(language);

  if (!stats?.available) {
    return createCell(metrics.notAvailable);
  }

  if (!stats.recovered) {
    return createCell(metrics.notRecovered);
  }

  return createDurationCell(stats.days, language);
}

function buildMetricRow(label, funds, builder) {
  return {
    label,
    cells: funds.map((fund) => builder(fund)),
  };
}

export function buildComparisonMetrics(funds, rangeKey = "1Y", language = "en") {
  const { metrics } = getI18n(language);
  const comparableFunds = funds.filter((fund) => fund.history?.length);
  const comparisonEndDate = getCommonComparisonEndDate(comparableFunds);
  const normalizedRangeKey = normalizeRangeKey(rangeKey);
  const isMaxRange = normalizedRangeKey === "MAX";
  const isYtdRange = normalizedRangeKey === "YTD";
  const periodLabel = RANGE_OPTIONS.find((option) => option.key === normalizedRangeKey)?.label ?? normalizedRangeKey;

  const periodWindowByFund = new Map(
    comparableFunds.map((fund) => [
      fund.isin,
      getComparisonMetricWindow(fund.history, normalizedRangeKey, comparisonEndDate),
    ])
  );

  const ytdWindowByFund = new Map(
    comparableFunds.map((fund) => [
      fund.isin,
      getComparisonMetricWindow(fund.history, "YTD", comparisonEndDate),
    ])
  );
  const observedSeriesByFund = new Map(
    comparableFunds.map((fund) => [
      fund.isin,
      filterSeries(fund.history, normalizedRangeKey, comparisonEndDate),
    ])
  );

  const getPeriodWindowForFund = (fund) => periodWindowByFund.get(fund.isin) ?? null;
  const getPeriodSeries = (fund) => getPeriodWindowForFund(fund)?.periodSeries ?? [];
  const getYtdWindowForFund = (fund) => ytdWindowByFund.get(fund.isin) ?? null;
  const getObservedSeries = (fund) => observedSeriesByFund.get(fund.isin) ?? [];

  const getComparableEndPoint = (fund) => {
    if (!comparisonEndDate) {
      return fund.history[fund.history.length - 1] ?? null;
    }

    return resolveBoundaryPointWithPreference(fund.history, new Date(comparisonEndDate), { preference: "before" });
  };

  const profitabilityRows = [
    buildMetricRow(metrics.accumulatedReturn(periodLabel), comparableFunds, (fund) => {
      const periodSeries = getPeriodSeries(fund);
      return createPercentCell(computeChange(periodSeries)?.percent, language);
    }),
    buildMetricRow(metrics.annualizedReturn(periodLabel), comparableFunds, (fund) => {
      return createPercentCell(
        computeAnnualizedReturnForWindow(getPeriodWindowForFund(fund)),
        language
      );
    }),
  ];

  if (!isMaxRange) {
    profitabilityRows.push(
      buildMetricRow(metrics.cagrFullHistory, comparableFunds, (fund) =>
        createPercentCell(computePeriodAnnualizedReturn(fund.history), language)
      )
    );
  }

  if (!isYtdRange) {
    profitabilityRows.push(
      buildMetricRow(metrics.ytdReturn, comparableFunds, (fund) => {
        const ytdWindow = getYtdWindowForFund(fund);
        return createPercentCell(computeChange(ytdWindow?.periodSeries ?? [])?.percent, language);
      })
    );
  }

  const contextRows = [
    buildMetricRow(metrics.observations(periodLabel), comparableFunds, (fund) => {
      return createNumberCell(getObservedSeries(fund).length, 0, language);
    }),
    buildMetricRow(metrics.historyAge, comparableFunds, (fund) => {
      const endPoint = getComparableEndPoint(fund);
      const firstPoint = fund.history[0];
      const years = computeYearsBetween(firstPoint?.date, endPoint?.date);

      return createDurationCell(Number.isFinite(years) ? Math.round(years * DAYS_PER_YEAR) : null, language);
    }),
  ];

  if (!isMaxRange) {
    contextRows.push(
      buildMetricRow(metrics.maxDrawdownFullHistory, comparableFunds, (fund) =>
        createPercentCell(computeMaxDrawdown(fund.history)?.value, language)
      ),
      buildMetricRow(metrics.mddRecoveryFullHistory, comparableFunds, (fund) =>
        createRecoveryCell(computeRecoveryStats(fund.history), language)
      )
    );
  }

  return {
    note: metrics.note(periodLabel),
    sections: [
      {
        title: metrics.profitability,
        rows: profitabilityRows,
      },
      {
        title: metrics.risk,
        rows: [
          buildMetricRow(metrics.annualizedVolatility(periodLabel), comparableFunds, (fund) => {
            const periodSeries = getPeriodSeries(fund);
            return createPercentCell(computeVolatility(periodSeries), language, { tone: false });
          }),
          buildMetricRow(metrics.maxDrawdown(periodLabel), comparableFunds, (fund) => {
            const periodSeries = getPeriodSeries(fund);
            return createPercentCell(computeMaxDrawdown(periodSeries)?.value, language);
          }),
          buildMetricRow(metrics.returnToVolatility(periodLabel), comparableFunds, (fund) => {
            const periodSeries = getPeriodSeries(fund);
            const annualizedReturn = computeAnnualizedReturnForWindow(getPeriodWindowForFund(fund));
            const annualizedVolatility = computeVolatility(periodSeries);

            return createRatioCell(
              computeReturnToVolatility(annualizedReturn, annualizedVolatility),
              2,
              language
            );
          }),
          buildMetricRow(metrics.mddRecovery(periodLabel), comparableFunds, (fund) => {
            const periodSeries = getPeriodSeries(fund);
            return createRecoveryCell(computeRecoveryStats(periodSeries), language);
          }),
        ],
      },
      {
        title: metrics.context,
        rows: contextRows,
      },
    ],
  };
}

export function buildCorrelationMatrix(funds, rangeKey = "1Y") {
  const comparableFunds = funds.filter((fund) => fund.history?.length);
  const comparisonEndDate = getCommonComparisonEndDate(comparableFunds);
  const normalizedRangeKey = normalizeRangeKey(rangeKey);
  const periodSeriesByFund = new Map(
    comparableFunds.map((fund) => [
      fund.isin,
      getComparisonMetricWindow(fund.history, normalizedRangeKey, comparisonEndDate)?.periodSeries ?? [],
    ])
  );

  return {
    funds: comparableFunds,
    rows: comparableFunds.map((rowFund) => ({
      fund: rowFund,
      cells: comparableFunds.map((columnFund) =>
        buildCorrelationCell(rowFund, columnFund, periodSeriesByFund)
      ),
    })),
  };
}

export async function fetchFunds(entries, language = "en") {
  const { api } = getI18n(language);
  const response = await fetch("/api/funds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entries, language }),
  });

  const rawResponse = await response.text();
  let payload;

  try {
    payload = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      rawResponse.startsWith("<!DOCTYPE")
        ? api.invalidApiHtml
        : api.invalidApiResponse
    );
  }

  if (!response.ok) {
    throw new Error(payload.error || api.loadInfoFailed);
  }

  return payload;
}
