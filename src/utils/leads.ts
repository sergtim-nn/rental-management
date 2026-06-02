import { LeadStatus } from '../types';

export const PHONE_BOOTH_CATEGORY_ID = 'phone_booth';

export interface LeadStatusMeta {
  value: LeadStatus;
  label: string;
  // Tailwind классы для бейджа на карточке/в модалке
  chipClass: string;
  // Требует ли поле "Действие"
  requiresAction: boolean;
}

export const LEAD_STATUSES: LeadStatusMeta[] = [
  { value: '',              label: 'Не выбран',   chipClass: 'bg-slate-100 text-slate-500',     requiresAction: false },
  { value: 'not_answered',  label: 'Не отвечает', chipClass: 'bg-slate-200 text-slate-600',     requiresAction: false },
  { value: 'not_relevant',  label: 'Не актуально',chipClass: 'bg-red-100 text-red-600',         requiresAction: false },
  { value: 'thinking',      label: 'Думает',      chipClass: 'bg-amber-100 text-amber-700',     requiresAction: true  },
  { value: 'ready',         label: 'Готов',       chipClass: 'bg-emerald-100 text-emerald-700', requiresAction: true  },
  { value: 'booked',        label: 'Забронировал',chipClass: 'bg-blue-100 text-blue-700',       requiresAction: true  },
];

export function getLeadStatusMeta(status: LeadStatus | undefined): LeadStatusMeta {
  return LEAD_STATUSES.find((s) => s.value === (status ?? '')) ?? LEAD_STATUSES[0];
}

export function isLeadCategory(categoryId: string | null | undefined): boolean {
  return categoryId === PHONE_BOOTH_CATEGORY_ID;
}
