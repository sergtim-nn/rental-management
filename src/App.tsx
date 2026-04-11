import { useState, useMemo } from 'react';
import { useAppState } from './hooks/useAppState';
import { getUpcomingNotifications } from './utils/notifications';
import { RealEstateObject } from './types';

import Sidebar, { MobileMenuButton } from './components/Sidebar';
import ObjectCard from './components/ObjectCard';
import ObjectModal from './components/ObjectModal';
import Dashboard from './components/Dashboard';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import LoginScreen from './components/LoginScreen';
import { Plus, Search, X } from 'lucide-react';

type ActiveView = 'dashboard' | 'category' | 'notifications' | 'archive' | 'settings';

export default function App() {
  const {
    state,
    isLoading,
    isAuthenticated,
    login,
    logout,
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
    addDocument,
    removeDocument,
    setNotificationDays,
    importState,
    resetState,
  } = useAppState();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalObjectId, setModalObjectId] = useState<string | null>(null);
  const [isModalNew, setIsModalNew] = useState(false);

  // ─── Derived state (все useMemo до любых early return) ───────────────────
  const notifications = useMemo(
    () => getUpcomingNotifications(state.objects, state.categories, state.notificationDaysBefore),
    [state.objects, state.categories, state.notificationDaysBefore]
  );

  const categoryObjects = useMemo(() => {
    let objs = state.objects.filter(
      (o) => !o.isArchived && o.categoryId === state.activeCategoryId
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      objs = objs.filter(
        (o) =>
          o.street.toLowerCase().includes(q) ||
          o.building.toLowerCase().includes(q) ||
          o.tenantName.toLowerCase().includes(q) ||
          o.tenantPhone.includes(q)
      );
    }
    return objs;
  }, [state.objects, state.activeCategoryId, searchQuery]);

  const archivedObjects = useMemo(() => {
    let objs = state.objects.filter((o) => o.isArchived);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      objs = objs.filter(
        (o) =>
          o.street.toLowerCase().includes(q) ||
          o.building.toLowerCase().includes(q) ||
          o.tenantName.toLowerCase().includes(q)
      );
    }
    return objs;
  }, [state.objects, searchQuery]);

  const objectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.objects.filter((o) => !o.isArchived).forEach((o) => {
      counts[o.categoryId] = (counts[o.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [state.objects]);

  const modalObject = useMemo(
    () => state.objects.find((o) => o.id === modalObjectId) ?? null,
    [state.objects, modalObjectId]
  );

  const activeCategory = useMemo(
    () => state.categories.find((c) => c.id === state.activeCategoryId),
    [state.categories, state.activeCategoryId]
  );

  const pageTitle = useMemo(() => {
    switch (activeView) {
      case 'dashboard': return 'Дашборд';
      case 'notifications': return 'Уведомления';
      case 'archive': return 'Архив';
      case 'settings': return 'Настройки';
      case 'category': return activeCategory?.name ?? 'Объекты';
    }
  }, [activeView, activeCategory]);

  // ─── Auth (после всех хуков) ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Загрузка данных...</div>
      </div>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectCategory = (id: string) => {
    setActiveCategoryId(id);
    setActiveView('category');
    setSearchQuery('');
  };

  const handleSelectView = (view: string) => {
    setActiveView(view as ActiveView);
    setSearchQuery('');
  };

  const handleOpenObject = (id: string) => {
    setModalObjectId(id);
    setIsModalNew(false);
  };

  const handleNewObject = () => {
    setModalObjectId(null);
    setIsModalNew(true);
  };

  const handleModalSave = (data: Partial<RealEstateObject>) => {
    if (isModalNew) {
      addObject(data as Omit<RealEstateObject, 'id' | 'createdAt' | 'updatedAt' | 'paymentHistory' | 'documents' | 'currentPayment' | 'isArchived'>);
    } else if (modalObjectId) {
      updateObject(modalObjectId, data);
    }
    setModalObjectId(null);
    setIsModalNew(false);
  };

  const handleModalClose = () => {
    setModalObjectId(null);
    setIsModalNew(false);
  };

  const handleAddDocument = (file: File) => {
    if (modalObjectId) addDocument(modalObjectId, file);
  };

  const handleRemoveDocument = (docId: string) => {
    if (modalObjectId) removeDocument(modalObjectId, docId);
  };

  const handleSaveToHistory = (period: string) => {
    if (modalObjectId) saveCurrentPaymentToHistory(modalObjectId, period);
  };

  const handleImportState = async (imported: typeof state) => {
    await importState(imported);
  };

  const handleReset = async () => {
    await resetState();
  };

  const showSearchAndAdd = activeView === 'category' || activeView === 'archive';

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        categories={state.categories}
        activeCategoryId={state.activeCategoryId}
        activeView={activeView}
        notifications={notifications}
        objectCounts={objectCounts}
        onSelectCategory={handleSelectCategory}
        onSelectView={handleSelectView}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Mobile menu button */}
      <MobileMenuButton
        onClick={() => setIsMobileOpen(true)}
        notifCount={notifications.length}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            {/* Title */}
            <div className="flex items-center gap-2 ml-12 lg:ml-0">
              {activeView === 'category' && activeCategory && (
                <span className="text-xl">{activeCategory.icon}</span>
              )}
              <h2 className="font-bold text-slate-800 text-lg">{pageTitle}</h2>
              {activeView === 'category' && (
                <span className="text-sm text-slate-400 font-normal">
                  ({categoryObjects.length} объект{categoryObjects.length === 1 ? '' : categoryObjects.length < 5 ? 'а' : 'ов'})
                </span>
              )}
              {activeView === 'archive' && (
                <span className="text-sm text-slate-400 font-normal">
                  ({archivedObjects.length})
                </span>
              )}
            </div>

            {/* Search */}
            {showSearchAndAdd && (
              <div className="flex-1 max-w-xs ml-auto relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Add button */}
            {activeView === 'category' && (
              <button
                onClick={handleNewObject}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors flex-shrink-0"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">

          {/* Dashboard */}
          {activeView === 'dashboard' && (
            <Dashboard
              objects={state.objects}
              categories={state.categories}
              onSelectCategory={handleSelectCategory}
            />
          )}

          {/* Category view */}
          {activeView === 'category' && (
            <>
              {categoryObjects.length === 0 ? (
                <EmptyState
                  icon={activeCategory?.icon ?? '📦'}
                  title={searchQuery ? 'Ничего не найдено' : 'Нет объектов'}
                  subtitle={
                    searchQuery
                      ? 'Попробуйте изменить запрос'
                      : `Добавьте первый объект в категорию "${activeCategory?.name}"`
                  }
                  action={
                    !searchQuery ? (
                      <button
                        onClick={handleNewObject}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
                      >
                        <Plus size={16} />
                        Добавить объект
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categoryObjects.map((obj) => (
                    <ObjectCard
                      key={obj.id}
                      obj={obj}
                      category={state.categories.find((c) => c.id === obj.categoryId)}
                      onClick={() => handleOpenObject(obj.id)}
                      onArchive={() => archiveObject(obj.id)}
                      onRestore={() => restoreObject(obj.id)}
                      onDelete={() => deleteObject(obj.id)}
                    />
                  ))}
                  {/* Add new card */}
                  <button
                    onClick={handleNewObject}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-white transition-all min-h-48"
                  >
                    <Plus size={28} />
                    <span className="text-sm font-medium">Добавить объект</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Archive */}
          {activeView === 'archive' && (
            <>
              {archivedObjects.length === 0 ? (
                <EmptyState
                  icon="📁"
                  title="Архив пуст"
                  subtitle="Заархивированные объекты будут отображаться здесь"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {archivedObjects.map((obj) => (
                    <ObjectCard
                      key={obj.id}
                      obj={obj}
                      category={state.categories.find((c) => c.id === obj.categoryId)}
                      onClick={() => handleOpenObject(obj.id)}
                      onArchive={() => archiveObject(obj.id)}
                      onRestore={() => restoreObject(obj.id)}
                      onDelete={() => {
                        if (window.confirm('Удалить объект навсегда?')) deleteObject(obj.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Notifications */}
          {activeView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              allObjects={state.objects}
              categories={state.categories}
              notificationDaysBefore={state.notificationDaysBefore}
              onChangeNotificationDays={setNotificationDays}
              onObjectClick={(id) => handleOpenObject(id)}
            />
          )}

          {/* Settings */}
          {activeView === 'settings' && (
            <SettingsView
              state={state}
              onImport={handleImportState}
              onReset={handleReset}
              onLogout={logout}
            />
          )}
        </div>
      </main>

      {/* Object Modal */}
      {(isModalNew || modalObjectId !== null) && (
        <ObjectModal
          obj={modalObject}
          categories={state.categories}
          isNew={isModalNew}
          defaultCategoryId={state.activeCategoryId ?? state.categories[0]?.id ?? ''}
          onSave={handleModalSave}
          onClose={handleModalClose}
          onAddDocument={handleAddDocument}
          onRemoveDocument={handleRemoveDocument}
          onSaveToHistory={handleSaveToHistory}
        />
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs mb-6">{subtitle}</p>
      {action}
    </div>
  );
}
