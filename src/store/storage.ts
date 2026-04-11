import { AppState, Category, RealEstateObject } from '../types';

const STORAGE_KEY = 'renta_manager_v1';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'parking',
    name: 'Парковка',
    icon: '🅿️',
    color: 'blue',
    isDefault: true,
    order: 0,
  },
  {
    id: 'apartments',
    name: 'Квартиры',
    icon: '🏠',
    color: 'green',
    isDefault: true,
    order: 1,
  },
  {
    id: 'commercial',
    name: 'Коммерческая',
    icon: '🏢',
    color: 'purple',
    isDefault: true,
    order: 2,
  },
  {
    id: 'other',
    name: 'Другое',
    icon: '📦',
    color: 'orange',
    isDefault: true,
    order: 3,
  },
];

export const DEFAULT_STATE: AppState = {
  categories: DEFAULT_CATEGORIES,
  objects: [],
  activeCategoryId: 'parking',
  notificationDaysBefore: 3,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AppState;
    // Merge in case new default categories were added
    return {
      ...DEFAULT_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function emptyCurrentPayment(): RealEstateObject['currentPayment'] {
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    rentPaymentDate: today,
    actualRent: 0,
    rentPaymentType: 'cash',
    actualUtilities: 0,
    utilitiesPaymentDate: today,
    utilitiesPaymentType: 'cash',
    note: '',
  };
}
