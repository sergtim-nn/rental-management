export type PaymentType = 'cash' | 'card';

export interface PaymentRecord {
  id: string;
  date: string; // ISO date
  period: string; // "YYYY-MM"
  plannedRent: number;
  actualRent: number;
  rentPaymentDate: string;
  rentPaymentType: PaymentType;
  plannedUtilities: number;
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
  dataUrl: string; // base64
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
  plannedUtilities: number;
  // Текущий период (активный платёж)
  currentPayment: Omit<PaymentRecord, 'id' | 'period' | 'plannedRent' | 'plannedUtilities'>;
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

export interface Notification {
  objectId: string;
  objectAddress: string;
  categoryName: string;
  tenantName: string;
  dueDate: string;
  daysLeft: number;
  type: 'rent' | 'utilities';
}
