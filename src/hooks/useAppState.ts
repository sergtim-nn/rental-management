import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Category, RealEstateObject, PaymentRecord } from '../types';
import { generateId, emptyCurrentPayment } from '../store/storage';
import { api, getToken, setToken, removeToken } from '../api/client';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'parking',    name: 'Парковка',     icon: '🅿️', color: 'blue',   isDefault: true, order: 0 },
  { id: 'apartments', name: 'Квартиры',     icon: '🏠', color: 'green',  isDefault: true, order: 1 },
  { id: 'commercial', name: 'Коммерческая', icon: '🏢', color: 'purple', isDefault: true, order: 2 },
  { id: 'other',      name: 'Другое',       icon: '📦', color: 'orange', isDefault: true, order: 3 },
];

const EMPTY_STATE: AppState = {
  categories: [],
  objects: [],
  activeCategoryId: null,
  notificationDaysBefore: 3,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getToken()));

  // Всегда актуальный state для использования в колбэках без зависимостей
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── Загрузка данных с API ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    api.getState()
      .then((data) => {
        setState((s) => ({
          ...data,
          activeCategoryId: s.activeCategoryId ?? data.categories[0]?.id ?? null,
        }));
      })
      .catch((err: Error) => {
        if (err.message === 'UNAUTHORIZED') setIsAuthenticated(false);
        else console.error('Failed to load state:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  // ─── Авторизация ───────────────────────────────────────────────────────────
  const login = useCallback(async (password: string) => {
    const { token } = await api.login(password);
    setToken(token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setIsAuthenticated(false);
    setState(EMPTY_STATE);
  }, []);

  // ─── UI ────────────────────────────────────────────────────────────────────
  const setActiveCategoryId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, activeCategoryId: id }));
  }, []);

  const sortCategories = useCallback((categories: Category[]) => (
    [...categories].sort((a, b) => a.order - b.order)
  ), []);

  // ─── Categories ───────────────────────────────────────────────────────────
  const addCategory = useCallback(async (name: string, icon: string, color: string) => {
    const id = generateId();
    const newCat: Category = { id, name, icon, color, isDefault: false, order: stateRef.current.categories.length };
    const created = await api.createCategory(newCat).catch((e: Error) => {
      console.error('Failed to create category:', e);
      return null;
    });
    if (!created) return null;
    setState((s) => ({
      ...s,
      categories: sortCategories([...s.categories, created]),
      activeCategoryId: created.id,
    }));
    return created.id;
  }, [sortCategories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    const cat = stateRef.current.categories.find((c) => c.id === id);
    if (!cat) return false;
    const merged = { ...cat, ...updates };
    // Оптимистичное обновление
    setState((s) => ({
      ...s,
      categories: sortCategories(s.categories.map((c) => (c.id === id ? merged : c))),
    }));
    const updatedCategory = await api.updateCategory(id, merged).catch((err: Error) => {
      console.error('Failed to update category:', err);
      // Откат
      setState((s) => ({
        ...s,
        categories: sortCategories(s.categories.map((c) => (c.id === id ? cat : c))),
      }));
      return null;
    });
    if (!updatedCategory) return false;
    setState((s) => ({
      ...s,
      categories: sortCategories(s.categories.map((c) => (c.id === id ? updatedCategory : c))),
    }));
    return true;
  }, [sortCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await api.deleteCategory(id);
      setState((s) => {
        const remaining = s.categories.filter((c) => c.id !== id);
        return {
          ...s,
          categories: sortCategories(remaining),
          objects: s.objects.filter((o) => o.categoryId !== id),
          activeCategoryId:
            s.activeCategoryId === id ? (remaining[0]?.id ?? null) : s.activeCategoryId,
        };
      });
      return true;
    } catch (err) {
      console.error('Failed to delete category:', err);
      return false;
    }
  }, [sortCategories]);

  const reorderCategory = useCallback(async (id: string, direction: 'up' | 'down') => {
    const categories = sortCategories(stateRef.current.categories);
    const index = categories.findIndex((c) => c.id === id);
    if (index < 0) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return false;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = reordered.map((category, order) => ({ ...category, order }));
    const previous = categories;

    setState((s) => ({ ...s, categories: normalized }));

    const saved = await Promise.all(
      normalized.map((category) => api.updateCategory(category.id, category))
    ).catch((err: Error) => {
      console.error('Failed to reorder categories:', err);
      setState((s) => ({ ...s, categories: previous }));
      return null;
    });

    if (!saved) return false;

    setState((s) => ({ ...s, categories: sortCategories(saved) }));
    return true;
  }, [sortCategories]);

  // ─── Objects ──────────────────────────────────────────────────────────────
  const addObject = useCallback(async (
    data: Omit<RealEstateObject, 'id' | 'createdAt' | 'updatedAt' | 'paymentHistory' | 'documents' | 'currentPayment' | 'isArchived'>
  ) => {
    const id = generateId();
    const now = new Date().toISOString();
    const newObj: RealEstateObject = {
      ...data, id,
      currentPayment: emptyCurrentPayment(),
      paymentHistory: [],
      documents: [],
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    const created = await api.createObject(newObj).catch((e: Error) => {
      console.error('Failed to create object:', e);
      return null;
    });
    if (created) {
      setState((s) => ({ ...s, objects: [...s.objects, created] }));
    }
    return id;
  }, []);

  const updateObject = useCallback(async (id: string, updates: Partial<RealEstateObject>) => {
    const obj = stateRef.current.objects.find((o) => o.id === id);
    if (!obj) return;
    const updated = { ...obj, ...updates, updatedAt: new Date().toISOString() };
    // Оптимистично
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) => (o.id === id ? updated : o)),
    }));
    const serverObj = await api.updateObject(id, updated).catch((err: Error) => {
      console.error('Failed to update object:', err);
      setState((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? obj : o)) }));
      return null;
    });
    if (serverObj) {
      setState((s) => ({
        ...s,
        objects: s.objects.map((o) => (o.id === id ? serverObj : o)),
      }));
    }
  }, []);

  const archiveObject = useCallback(async (id: string) => {
    const obj = stateRef.current.objects.find((o) => o.id === id);
    if (!obj) return;
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, isArchived: true, updatedAt: new Date().toISOString() } : o
      ),
    }));
    await api.archiveObject(id).catch((err: Error) => {
      console.error('Failed to archive object:', err);
      setState((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? obj : o)) }));
    });
  }, []);

  const restoreObject = useCallback(async (id: string) => {
    const obj = stateRef.current.objects.find((o) => o.id === id);
    if (!obj) return;
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, isArchived: false, updatedAt: new Date().toISOString() } : o
      ),
    }));
    await api.restoreObject(id).catch((err: Error) => {
      console.error('Failed to restore object:', err);
      setState((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? obj : o)) }));
    });
  }, []);

  const deleteObject = useCallback(async (id: string) => {
    const previousObjects = stateRef.current.objects;
    if (!previousObjects.some((o) => o.id === id)) return;

    setState((s) => ({ ...s, objects: s.objects.filter((o) => o.id !== id) }));

    await api.deleteObject(id).catch((err: Error) => {
      console.error('Failed to delete object:', err);
      setState((s) => ({ ...s, objects: previousObjects }));
    });
  }, []);

  // ─── Payment History ──────────────────────────────────────────────────────
  const saveCurrentPaymentToHistory = useCallback(async (
    objectId: string,
    period: string,
    paymentDraft?: {
      plannedRent: number;
      plannedUtilities: number;
      currentPayment: RealEstateObject['currentPayment'];
    }
  ) => {
    const obj = stateRef.current.objects.find((o) => o.id === objectId);
    if (!obj) return;
    const record: PaymentRecord = {
      id: generateId(),
      period,
      plannedRent: paymentDraft?.plannedRent ?? obj.plannedRent,
      plannedUtilities: paymentDraft?.plannedUtilities ?? obj.plannedUtilities,
      ...(paymentDraft?.currentPayment ?? obj.currentPayment),
    };
    const saved = await api.createPayment(objectId, record).catch((err: Error) => {
      console.error('Failed to save payment to history:', err);
      return null;
    });
    if (!saved) return;
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? {
              ...o,
              paymentHistory: [
                ...o.paymentHistory.filter((p) => p.period !== period),
                saved,
              ].sort((a, b) => b.period.localeCompare(a.period)),
              currentPayment: emptyCurrentPayment(),
              updatedAt: new Date().toISOString(),
            }
          : o
      ),
    }));
  }, []);

  const updatePaymentRecord = useCallback(async (
    objectId: string,
    recordId: string,
    updates: Partial<PaymentRecord>
  ) => {
    const obj = stateRef.current.objects.find((o) => o.id === objectId);
    if (!obj) return;
    const record = obj.paymentHistory.find((p) => p.id === recordId);
    if (!record) return;
    const updated = { ...record, ...updates };
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? {
              ...o,
              paymentHistory: o.paymentHistory
                .map((p) => (p.id === recordId ? updated : p))
                .sort((a, b) => b.period.localeCompare(a.period)),
            }
          : o
      ),
    }));
    const serverRecord = await api.updatePayment(objectId, recordId, updated).catch((err: Error) => {
      console.error('Failed to update payment record:', err);
      setState((s) => ({
        ...s,
        objects: s.objects.map((o) =>
          o.id === objectId
            ? {
                ...o,
                paymentHistory: o.paymentHistory
                  .map((p) => (p.id === recordId ? record : p))
                  .sort((a, b) => b.period.localeCompare(a.period)),
              }
            : o
        ),
      }));
      return null;
    });
    if (!serverRecord) return;
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? {
              ...o,
              paymentHistory: o.paymentHistory
                .map((p) => (p.id === recordId ? serverRecord : p))
                .sort((a, b) => b.period.localeCompare(a.period)),
            }
          : o
      ),
    }));
  }, []);

  // ─── Documents ────────────────────────────────────────────────────────────
  const addDocument = useCallback(async (objectId: string, file: File) => {
    const doc = await api.uploadDocument(objectId, file).catch((err: Error) => {
      console.error('Failed to upload document:', err);
      return null;
    });
    if (!doc) return;
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? { ...o, documents: [...o.documents, doc], updatedAt: new Date().toISOString() }
          : o
      ),
    }));
  }, []);

  const removeDocument = useCallback(async (objectId: string, docId: string) => {
    const obj = stateRef.current.objects.find((o) => o.id === objectId);
    if (!obj?.documents.some((d) => d.id === docId)) return;
    const previousDocuments = obj.documents;

    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? { ...o, documents: o.documents.filter((d) => d.id !== docId), updatedAt: new Date().toISOString() }
          : o
      ),
    }));
    await api.deleteDocument(objectId, docId).catch((err: Error) => {
      console.error('Failed to delete document:', err);
      setState((s) => ({
        ...s,
        objects: s.objects.map((o) =>
          o.id === objectId
            ? { ...o, documents: previousDocuments, updatedAt: new Date().toISOString() }
            : o
        ),
      }));
    });
  }, []);

  // ─── Settings ─────────────────────────────────────────────────────────────
  const setNotificationDays = useCallback(async (days: number) => {
    const previousDays = stateRef.current.notificationDaysBefore;
    setState((s) => ({ ...s, notificationDaysBefore: days }));
    const settings = await api.updateSettings(days).catch((err: Error) => {
      console.error('Failed to update settings:', err);
      setState((s) => ({ ...s, notificationDaysBefore: previousDays }));
      return null;
    });
    if (!settings) return;
    setState((s) => ({ ...s, notificationDaysBefore: settings.notificationDaysBefore }));
  }, []);

  // ─── Import / Reset ───────────────────────────────────────────────────────
  const importState = useCallback(async (imported: AppState) => {
    await api.importState(imported);
    const fresh = await api.getState();
    setState((s) => ({
      ...fresh,
      activeCategoryId: s.activeCategoryId ?? fresh.categories[0]?.id ?? null,
    }));
  }, []);

  const resetState = useCallback(async () => {
    await api.importState({
      categories: DEFAULT_CATEGORIES,
      objects: [],
      activeCategoryId: null,
      notificationDaysBefore: 3,
    });
    const fresh = await api.getState();
    setState({
      ...fresh,
      activeCategoryId: fresh.categories[0]?.id ?? null,
    });
  }, []);

  return {
    state,
    isLoading,
    isAuthenticated,
    login,
    logout,
    setActiveCategoryId,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
    addObject,
    updateObject,
    archiveObject,
    restoreObject,
    deleteObject,
    saveCurrentPaymentToHistory,
    updatePaymentRecord,
    addDocument,
    removeDocument,
    setNotificationDays,
    importState,
    resetState,
  };
}
