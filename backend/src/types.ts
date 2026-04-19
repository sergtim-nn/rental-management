export type PaymentType = 'cash' | 'card';

export interface PaymentRecord {
  id: string;
  date: string;
  period: string;
  plannedRent: number;
  actualRent: number;
  rentPaymentDate: string;
  rentPaymentType: PaymentType;
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
  url?: string;
  dataUrl?: string; // only present in data imported from localStorage backups
  uploadedAt: string;
}

export interface CurrentPayment {
  date: string;
  actualRent: number;
  rentPaymentDate: string;
  rentPaymentType: PaymentType;
  actualUtilities: number;
  utilitiesPaymentDate: string;
  utilitiesPaymentType: PaymentType;
  note?: string;
}

export interface RealEstateObject {
  id: string;
  categoryId: string;
  street: string;
  building: string;
  tenantName: string;
  tenantPhone: string;
  tenantTelegram: string;
  contractDate: string;
  plannedRent: number;
  currentPayment: CurrentPayment;
  paymentHistory: PaymentRecord[];
  documents: Document[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  order: number;
}

export interface AppState {
  categories: Category[];
  objects: RealEstateObject[];
  activeCategoryId: string | null;
  notificationDaysBefore: number;
}
