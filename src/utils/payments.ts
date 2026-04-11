import { RealEstateObject } from '../types';
import { getCurrentPeriod } from '../store/storage';

export interface PeriodPaymentSnapshot {
  period: string;
  hasData: boolean;
  source: 'history' | 'current' | 'none';
  plannedRent: number;
  actualRent: number;
  plannedUtilities: number;
  actualUtilities: number;
}

export function getPaymentSnapshotForPeriod(
  obj: RealEstateObject,
  period: string
): PeriodPaymentSnapshot {
  const historyRecord = obj.paymentHistory.find((record) => record.period === period);

  if (historyRecord) {
    return {
      period,
      hasData: true,
      source: 'history',
      plannedRent: historyRecord.plannedRent,
      actualRent: historyRecord.actualRent,
      plannedUtilities: historyRecord.plannedUtilities,
      actualUtilities: historyRecord.actualUtilities,
    };
  }

  if (period === getCurrentPeriod()) {
    return {
      period,
      hasData: true,
      source: 'current',
      plannedRent: obj.plannedRent,
      actualRent: obj.currentPayment.actualRent,
      plannedUtilities: obj.plannedUtilities,
      actualUtilities: obj.currentPayment.actualUtilities,
    };
  }

  return {
    period,
    hasData: false,
    source: 'none',
    plannedRent: 0,
    actualRent: 0,
    plannedUtilities: 0,
    actualUtilities: 0,
  };
}
