import { AppState, Category, RealEstateObject, PaymentRecord, Document, User } from '../types';

const API_BASE = '/api';

// ─── Token ────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('rental_auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('rental_auth_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('rental_auth_token');
}

// ─── Base request ─────────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  // Не выставляем Content-Type для FormData — браузер сделает сам
  if (!(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) },
  });

  if (res.status === 401) {
    removeToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (phone: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  // Users (admin only)
  getUsers: () => request<User[]>('/users'),
  createUser: (data: { phone: string; name: string; password: string; role: 'admin' | 'user' }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<{ name: string; password: string; role: 'admin' | 'user'; isActive: boolean }>) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),

  // State
  getState: () => request<AppState>('/state'),
  importState: (state: AppState) =>
    request<{ success: boolean }>('/state/import', {
      method: 'POST',
      body: JSON.stringify(state),
    }),

  // Categories
  createCategory: (cat: Category) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    }),
  updateCategory: (id: string, cat: Category) =>
    request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cat),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }),

  // Objects
  createObject: (obj: RealEstateObject) =>
    request<RealEstateObject>('/objects', {
      method: 'POST',
      body: JSON.stringify(obj),
    }),
  updateObject: (id: string, obj: RealEstateObject) =>
    request<RealEstateObject>(`/objects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(obj),
    }),
  deleteObject: (id: string) =>
    request<void>(`/objects/${id}`, { method: 'DELETE' }),
  archiveObject: (id: string) =>
    request<RealEstateObject>(`/objects/${id}/archive`, { method: 'POST' }),
  restoreObject: (id: string) =>
    request<RealEstateObject>(`/objects/${id}/restore`, { method: 'POST' }),

  // Payments
  createPayment: (objectId: string, payment: PaymentRecord) =>
    request<PaymentRecord>(`/objects/${objectId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
  updatePayment: (objectId: string, recordId: string, payment: PaymentRecord) =>
    request<PaymentRecord>(`/objects/${objectId}/payments/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payment),
    }),
  deletePayment: (objectId: string, recordId: string) =>
    request<void>(`/objects/${objectId}/payments/${recordId}`, { method: 'DELETE' }),

  // Documents
  uploadDocument: async (objectId: string, file: File): Promise<Document> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/objects/${objectId}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (res.status === 401) {
      removeToken();
      throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Upload failed');
    }
    return res.json() as Promise<Document>;
  },

  deleteDocument: (objectId: string, docId: string) =>
    request<void>(`/objects/${objectId}/documents/${docId}`, { method: 'DELETE' }),

  downloadDocument: async (url: string): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  },

  // Settings
  updateSettings: (notificationDaysBefore: number) =>
    request<{ notificationDaysBefore: number }>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ notificationDaysBefore }),
    }),
};
