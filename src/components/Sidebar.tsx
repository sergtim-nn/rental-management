import { useState } from 'react';
import { Category, Notification } from '../types';
import {
  Plus,
  Archive,
  Bell,
  Settings,
  ChevronRight,
  Trash2,
  Edit2,
  Check,
  X,
  Menu,
  BarChart2,
} from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Синий', bg: 'bg-blue-500' },
  { value: 'green', label: 'Зелёный', bg: 'bg-green-500' },
  { value: 'purple', label: 'Фиолетовый', bg: 'bg-purple-500' },
  { value: 'orange', label: 'Оранжевый', bg: 'bg-orange-500' },
  { value: 'red', label: 'Красный', bg: 'bg-red-500' },
  { value: 'yellow', label: 'Жёлтый', bg: 'bg-yellow-500' },
  { value: 'pink', label: 'Розовый', bg: 'bg-pink-500' },
  { value: 'teal', label: 'Бирюзовый', bg: 'bg-teal-500' },
];

const ICON_OPTIONS = ['🅿️', '🏠', '🏢', '📦', '🏭', '🏪', '🏗️', '🏬', '🏡', '🌳', '🚗', '💼'];

interface SidebarProps {
  categories: Category[];
  activeCategoryId: string | null;
  activeView: string;
  notifications: Notification[];
  objectCounts: Record<string, number>;
  onSelectCategory: (id: string) => void;
  onSelectView: (view: string) => void;
  onAddCategory: (name: string, icon: string, color: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  categories,
  activeCategoryId,
  activeView,
  notifications,
  objectCounts,
  onSelectCategory,
  onSelectView,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newColor, setNewColor] = useState('blue');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddCategory(newName.trim(), newIcon, newColor);
    setNewName('');
    setNewIcon('📦');
    setNewColor('blue');
    setShowAddForm(false);
  };

  const handleEditStart = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleEditSave = (id: string) => {
    if (editName.trim()) onUpdateCategory(id, { name: editName.trim() });
    setEditingId(null);
  };

  const getCategoryBgColor = (color: string, active: boolean) => {
    const map: Record<string, string> = {
      blue: active ? 'bg-blue-600' : 'bg-blue-50 hover:bg-blue-100',
      green: active ? 'bg-green-600' : 'bg-green-50 hover:bg-green-100',
      purple: active ? 'bg-purple-600' : 'bg-purple-50 hover:bg-purple-100',
      orange: active ? 'bg-orange-500' : 'bg-orange-50 hover:bg-orange-100',
      red: active ? 'bg-red-600' : 'bg-red-50 hover:bg-red-100',
      yellow: active ? 'bg-yellow-500' : 'bg-yellow-50 hover:bg-yellow-100',
      pink: active ? 'bg-pink-600' : 'bg-pink-50 hover:bg-pink-100',
      teal: active ? 'bg-teal-600' : 'bg-teal-50 hover:bg-teal-100',
    };
    return map[color] ?? (active ? 'bg-slate-600' : 'bg-slate-50 hover:bg-slate-100');
  };

  const getCategoryTextColor = (color: string, active: boolean) => {
    if (active) return 'text-white';
    const map: Record<string, string> = {
      blue: 'text-blue-800',
      green: 'text-green-800',
      purple: 'text-purple-800',
      orange: 'text-orange-800',
      red: 'text-red-800',
      yellow: 'text-yellow-800',
      pink: 'text-pink-800',
      teal: 'text-teal-800',
    };
    return map[color] ?? 'text-slate-800';
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Дашборд',
      icon: <BarChart2 size={18} />,
    },
    {
      id: 'notifications',
      label: 'Уведомления',
      icon: <Bell size={18} />,
      badge: notifications.length,
    },
    {
      id: 'archive',
      label: 'Архив',
      icon: <Archive size={18} />,
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: <Settings size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30
          flex flex-col shadow-xl transition-transform duration-300
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:shadow-none
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-bold text-slate-800">РентаМенеджер</h1>
            <p className="text-xs text-slate-400">Управление арендой</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-3 pt-3 pb-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSelectView(item.id); onCloseMobile(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeView === item.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-4 pt-3 pb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Категории
          </p>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {categories.map((cat) => {
            const isActive = activeView === 'category' && activeCategoryId === cat.id;
            const count = objectCounts[cat.id] ?? 0;
            return (
              <div key={cat.id} className="group relative">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(cat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={() => handleEditSave(cat.id)} className="text-green-600 hover:text-green-700">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { onSelectCategory(cat.id); onCloseMobile(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${getCategoryBgColor(cat.color, isActive)} ${getCategoryTextColor(cat.color, isActive)}`}
                  >
                    <span className="text-base leading-none">{cat.icon}</span>
                    <span className="flex-1 text-left">{cat.name}</span>
                    {count > 0 && (
                      <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-white/80 text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                    {isActive && <ChevronRight size={14} />}
                  </button>
                )}

                {/* Edit/Delete actions */}
                {!editingId && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white rounded-lg shadow-sm border border-slate-100 p-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditStart(cat); }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700"
                    >
                      <Edit2 size={12} />
                    </button>
                    {!cat.isDefault && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }}
                        className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add category button */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border-2 border-dashed border-slate-200 hover:border-slate-300 mt-2"
            >
              <Plus size={16} />
              <span>Добавить категорию</span>
            </button>
          ) : (
            <div className="bg-slate-50 rounded-xl p-3 mt-2 space-y-2 border border-slate-200">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
                placeholder="Название категории"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`text-base w-8 h-8 rounded-lg flex items-center justify-center transition-all ${newIcon === icon ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-slate-200'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewColor(c.value)}
                    className={`w-6 h-6 rounded-full ${c.bg} transition-all ${newColor === c.value ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="flex-1 bg-slate-800 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Добавить
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-200 text-slate-700 text-xs font-medium py-1.5 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            Данные хранятся локально
          </p>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick, notifCount }: { onClick: () => void; notifCount: number }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed top-4 left-4 z-10 bg-white shadow-md rounded-xl p-2.5 border border-slate-200"
    >
      <Menu size={22} className="text-slate-700" />
      {notifCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {notifCount}
        </span>
      )}
    </button>
  );
}
