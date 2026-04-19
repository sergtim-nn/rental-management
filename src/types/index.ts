export type PaymentType = 'cash' | 'card';

export interface PaymentRecord {
  id: string;
  date: string; // ISO date
  period: string; // "YYYY-MM"
  plannedRent: number;
  actualRent: number;
  rentPaymentDate: string;
  rentPaymentType: PaymentType;
  plannedUtilities: number; // сумма по счёту (вносится при получении счёта)
  actualUtilities: number;
  utilitiesPaymentDate: string;
  utilitiesPaymentType: PaymentType;
  note?: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;      // URL для скачивания с сервера
  dataUrl?: string;  // base64 — только при импорте старых бэкапов
  uploadedAt: string;
}

export interface RealEstateObject {
  id: string;
  categoryId: string;
  // Адрес
  street: string;
  building: string;
  // Арендатор
  tenantName: string;
  tenantPhone: string;
  tenantTelegram: string;
  // Договор
  contractDate: string;
  // Текущие плановые суммы
  plannedRent: number;
  // Текущий период (активный платёж)
  currentPayment: Omit<PaymentRecord, 'id' | 'period' | 'plannedRent'>;
  // История платежей
  paymentHistory: PaymentRecord[];
  // Документы
  documents: Document[];
  // Статус
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // tailwind color class
  isDefault: boolean;
  order: number;
}

export interface AppState {
  categories: Category[];
  objects: RealEstateObject[];
  activeCategoryId: string | null;
  notificationDaysBefore: number;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  created_at: string;
}

export interface Notification {
  objectId: string;
  objectAddress: string;
  categoryName: string;
  tenantName: string;
  dueDate: string;
  daysLeft: number;
  type: 'rent' | 'utilities';
}
