import { RealEstateObject, Category, Notification } from '../types';
import { differenceInDays, parseISO, isValid } from 'date-fns';

export function getUpcomingNotifications(
  objects: RealEstateObject[],
  categories: Category[],
  daysBefore: number
): Notification[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const notifications: Notification[] = [];

  objects
    .filter((o) => !o.isArchived)
    .forEach((obj) => {
      const category = categories.find((c) => c.id === obj.categoryId);
      const address = `${obj.street}, ${obj.building}`;
      const categoryName = category?.name ?? '';

      // Check rent payment date
      if (obj.currentPayment.rentPaymentDate) {
        const rentDate = parseISO(obj.currentPayment.rentPaymentDate);
        if (isValid(rentDate)) {
          const daysLeft = differenceInDays(rentDate, today);
          if (daysLeft >= 0 && daysLeft <= daysBefore && obj.currentPayment.actualRent === 0) {
            notifications.push({
              objectId: obj.id,
              objectAddress: address,
              categoryName,
              tenantName: obj.tenantName,
              dueDate: obj.currentPayment.rentPaymentDate,
              daysLeft,
              type: 'rent',
            });
          }
        }
      }

      // Check utilities payment date
      if (obj.currentPayment.utilitiesPaymentDate) {
        const utilDate = parseISO(obj.currentPayment.utilitiesPaymentDate);
        if (isValid(utilDate)) {
          const daysLeft = differenceInDays(utilDate, today);
          if (
            daysLeft >= 0 &&
            daysLeft <= daysBefore &&
            obj.currentPayment.actualUtilities === 0
          ) {
            notifications.push({
              objectId: obj.id,
              objectAddress: address,
              categoryName,
              tenantName: obj.tenantName,
              dueDate: obj.currentPayment.utilitiesPaymentDate,
              daysLeft,
              type: 'utilities',
            });
          }
        }
      }
    });

  return notifications.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatPeriod(period: string): string {
  if (!period) return '';
  const [year, month] = period.split('-');
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}
