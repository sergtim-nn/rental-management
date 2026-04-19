import { RealEstateObject } from '../types';
import { getCurrentPeriod } from '../store/storage';
import { formatPeriod } from './notifications';

export type PeriodMode = 'month' | 'range';

export interface PeriodSelection {
  mode: PeriodMode;
  month: string;
  from: string;
  to: string;
}

export interface PeriodPaymentSnapshot {
  period: string;
  hasData: boolean;
  source: 'history' | 'current' | 'none';
  paymentCount: number;
  plannedRent: number;
  actualRent: number;
  plannedUtilities: number;
  actualUtilities: number;
}

export interface PaymentSummary {
  periods: string[];
  hasAnyData: boolean;
  hasCurrentData: boolean;
  hasHistoryData: boolean;
  paymentCount: number;
  missingPeriods: string[];
  plannedRent: number;
  actualRent: number;
  plannedUtilities: number;
  actualUtilities: number;
}

export function normalizePeriodSelection(selection: PeriodSelection): PeriodSelection {
  if (selection.mode === 'month') {
    return { ...selection, from: selection.month, to: selection.month };
  }

  if (selection.from <= selection.to) return selection;
  return { ...selection, from: selection.to, to: selection.from };
}

export function getPeriodsForSelection(selection: PeriodSelection): string[] {
  const normalized = normalizePeriodSelection(selection);
  if (normalized.mode === 'month') return [normalized.month];

  const periods: string[] = [];
  const [startYear, startMonth] = normalized.from.split('-').map(Number);
  const [endYear, endMonth] = normalized.to.split('-').map(Number);

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return periods;
}

export function getPaymentSnapshotForPeriod(
  obj: RealEstateObject,
  period: string
): PeriodPaymentSnapshot {
  const historyRecords = obj.paymentHistory.filter((record) => record.period === period);

  if (historyRecords.length > 0) {
    const latestRecord = [...historyRecords].sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      period,
      hasData: true,
      source: 'history',
      paymentCount: historyRecords.length,
      plannedRent: latestRecord.plannedRent,
      actualRent: historyRecords.reduce((sum, record) => sum + record.actualRent, 0),
      plannedUtilities: latestRecord.plannedUtilities,
      actualUtilities: historyRecords.reduce((sum, record) => sum + record.actualUtilities, 0),
    };
  }

  if (period === getCurrentPeriod()) {
    const hasCurrentPayment = obj.currentPayment.actualRent > 0 || obj.currentPayment.actualUtilities > 0;
    return {
      period,
      hasData: true,
      source: 'current',
      paymentCount: hasCurrentPayment ? 1 : 0,
      plannedRent: obj.plannedRent,
      actualRent: obj.currentPayment.actualRent,
      plannedUtilities: obj.currentPayment.plannedUtilities,
      actualUtilities: obj.currentPayment.actualUtilities,
    };
  }

  return {
    period,
    hasData: false,
    source: 'none',
    paymentCount: 0,
    plannedRent: 0,
    actualRent: 0,
    plannedUtilities: 0,
    actualUtilities: 0,
  };
}

export function getPaymentSummaryForSelection(
  obj: RealEstateObject,
  selection: PeriodSelection
): PaymentSummary {
  const periods = getPeriodsForSelection(selection);
  const snapshots = periods.map((period) => getPaymentSnapshotForPeriod(obj, period));

  return {
    periods,
    hasAnyData: snapshots.some((snapshot) => snapshot.hasData),
    hasCurrentData: snapshots.some((snapshot) => snapshot.source === 'current'),
    hasHistoryData: snapshots.some((snapshot) => snapshot.source === 'history'),
    paymentCount: snapshots.reduce((sum, snapshot) => sum + snapshot.paymentCount, 0),
    missingPeriods: snapshots.filter((snapshot) => !snapshot.hasData).map((snapshot) => snapshot.period),
    plannedRent: snapshots.reduce((sum, snapshot) => sum + snapshot.plannedRent, 0),
    actualRent: snapshots.reduce((sum, snapshot) => sum + snapshot.actualRent, 0),
    plannedUtilities: snapshots.reduce((sum, snapshot) => sum + snapshot.plannedUtilities, 0),
    actualUtilities: snapshots.reduce((sum, snapshot) => sum + snapshot.actualUtilities, 0),
  };
}

export function formatSelectionLabel(selection: PeriodSelection): string {
  const normalized = normalizePeriodSelection(selection);
  if (normalized.mode === 'month') return formatPeriod(normalized.month);
  if (normalized.from === normalized.to) return formatPeriod(normalized.from);
  return `${formatPeriod(normalized.from)} - ${formatPeriod(normalized.to)}`;
}
