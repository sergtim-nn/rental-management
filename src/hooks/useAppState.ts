import { useState, useEffect, useCallback } from 'react';
import { AppState, Category, RealEstateObject, PaymentRecord, Document } from '../types';
import {
  loadState,
  saveState,
  generateId,
  emptyCurrentPayment,
} from '../store/storage';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setActiveCategoryId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, activeCategoryId: id }));
  }, []);

  // ─── Categories ───────────────────────────────────────────────
  const addCategory = useCallback((name: string, icon: string, color: string) => {
    const id = generateId();
    const newCat: Category = {
      id,
      name,
      icon,
      color,
      isDefault: false,
      order: Date.now(),
    };
    setState((s) => ({
      ...s,
      categories: [...s.categories, newCat],
      activeCategoryId: id,
    }));
    return id;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setState((s) => {
      const remaining = s.categories.filter((c) => c.id !== id);
      return {
        ...s,
        categories: remaining,
        objects: s.objects.filter((o) => o.categoryId !== id),
        activeCategoryId:
          s.activeCategoryId === id
            ? (remaining[0]?.id ?? null)
            : s.activeCategoryId,
      };
    });
  }, []);

  // ─── Objects ──────────────────────────────────────────────────
  const addObject = useCallback(
    (data: Omit<RealEstateObject, 'id' | 'createdAt' | 'updatedAt' | 'paymentHistory' | 'documents' | 'currentPayment' | 'isArchived'>) => {
      const id = generateId();
      const now = new Date().toISOString();
      const newObj: RealEstateObject = {
        ...data,
        id,
        currentPayment: emptyCurrentPayment(),
        paymentHistory: [],
        documents: [],
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({ ...s, objects: [...s.objects, newObj] }));
      return id;
    },
    []
  );

  const updateObject = useCallback((id: string, updates: Partial<RealEstateObject>) => {
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
      ),
    }));
  }, []);

  const archiveObject = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, isArchived: true, updatedAt: new Date().toISOString() } : o
      ),
    }));
  }, []);

  const restoreObject = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, isArchived: false, updatedAt: new Date().toISOString() } : o
      ),
    }));
  }, []);

  const deleteObject = useCallback((id: string) => {
    setState((s) => ({ ...s, objects: s.objects.filter((o) => o.id !== id) }));
  }, []);

  // ─── Payment History ──────────────────────────────────────────
  const saveCurrentPaymentToHistory = useCallback(
    (objectId: string, period: string) => {
      setState((s) => {
        const obj = s.objects.find((o) => o.id === objectId);
        if (!obj) return s;
        const record: PaymentRecord = {
          id: generateId(),
          period,
          plannedRent: obj.plannedRent,
          plannedUtilities: obj.plannedUtilities,
          ...obj.currentPayment,
        };
        const updatedHistory = [
          ...obj.paymentHistory.filter((p) => p.period !== period),
          record,
        ].sort((a, b) => b.period.localeCompare(a.period));
        return {
          ...s,
          objects: s.objects.map((o) =>
            o.id === objectId
              ? {
                  ...o,
                  paymentHistory: updatedHistory,
                  currentPayment: emptyCurrentPayment(),
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        };
      });
    },
    []
  );

  const updatePaymentRecord = useCallback(
    (objectId: string, recordId: string, updates: Partial<PaymentRecord>) => {
      setState((s) => ({
        ...s,
        objects: s.objects.map((o) =>
          o.id === objectId
            ? {
                ...o,
                paymentHistory: o.paymentHistory.map((p) =>
                  p.id === recordId ? { ...p, ...updates } : p
                ),
                updatedAt: new Date().toISOString(),
              }
            : o
        ),
      }));
    },
    []
  );

  // ─── Documents ────────────────────────────────────────────────
  const addDocument = useCallback((objectId: string, doc: Document) => {
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? { ...o, documents: [...o.documents, doc], updatedAt: new Date().toISOString() }
          : o
      ),
    }));
  }, []);

  const removeDocument = useCallback((objectId: string, docId: string) => {
    setState((s) => ({
      ...s,
      objects: s.objects.map((o) =>
        o.id === objectId
          ? {
              ...o,
              documents: o.documents.filter((d) => d.id !== docId),
              updatedAt: new Date().toISOString(),
            }
          : o
      ),
    }));
  }, []);

  // ─── Settings ─────────────────────────────────────────────────
  const setNotificationDays = useCallback((days: number) => {
    setState((s) => ({ ...s, notificationDaysBefore: days }));
  }, []);

  return {
    state,
    setActiveCategoryId,
    addCategory,
    updateCategory,
    deleteCategory,
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
  };
}
