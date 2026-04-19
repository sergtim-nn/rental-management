import { useState } from 'react';
import { Category, RealEstateObject } from '../types';
import { PeriodSelection, getPaymentSummaryForSelection } from '../utils/payments';
import { formatCurrency } from '../utils/notifications';
import {
  Plus,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'blue',   label: 'Синий',      bg: 'bg-blue-500' },
  { value: 'green',  label: 'Зелёный',    bg: 'bg-green-500' },
  { value: 'purple', label: 'Фиолетовый', bg: 'bg-purple-500' },
  { value: 'orange', label: 'Оранжевый',  bg: 'bg-orange-500' },
  { value: 'red',    label: 'Красный',    bg: 'bg-red-500' },
  { value: 'yellow', label: 'Жёлтый',     bg: 'bg-yellow-500' },
  { value: 'pink',   label: 'Розовый',    bg: 'bg-pink-500' },
  { value: 'teal',   label: 'Бирюзовый',  bg: 'bg-teal-500' },
];

const ICON_OPTIONS = ['🅿️', '🏠', '🏢', '📦', '🏭', '🏪', '🏗️', '🏬', '🏡', '🌳', '🚗', '💼'];

const CAT_COLORS: Record<string, { light: string; text: string }> = {
  blue:   { light: 'bg-blue-50',   text: 'text-blue-700' },
  green:  { light: 'bg-green-50',  text: 'text-green-700' },
  purple: { light: 'bg-[#f0ebf8]', text: 'text-[#6d548c]' },
  orange: { light: 'bg-orange-50', text: 'text-orange-700' },
  red:    { light: 'bg-red-50',    text: 'text-red-700' },
  yellow: { light: 'bg-yellow-50', text: 'text-yellow-700' },
  pink:   { light: 'bg-pink-50',   text: 'text-pink-700' },
  teal:   { light: 'bg-teal-50',   text: 'text-teal-700' },
};

const BAR_COLORS: Record<string, string> = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  purple: 'bg-[#967BB6]',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
  yellow: 'bg-yellow-500',
  pink:   'bg-pink-500',
  teal:   'bg-teal-500',
};

interface Props {
  categories: Category[];
  objects: RealEstateObject[];
  objectCounts: Record<string, number>;
  periodSelection: PeriodSelection;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string, icon: string, color: string) => Promise<string | null>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onReorderCategory: (id: string, direction: 'up' | 'down') => Promise<boolean>;
}

export default function MobileCategoriesScreen({
  categories,
  objects,
  objectCounts,
  periodSelection,
  onSelectCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategory,
}: Props) {
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editName, setEditName]           = useState('');
  const [editIcon, setEditIcon]           = useState('📦');
  const [editColor, setEditColor]         = useState('blue');
  const [isSaving, setIsSaving]           = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newIcon, setNewIcon]         = useState('📦');
  const [newColor, setNewColor]       = useState('purple');
  const [isAdding, setIsAdding]       = useState(false);
  const [globalError, setGlobalError] = useState('');

  const activeObjects = objects.filter((o) => !o.isArchived);

  const handleEditStart = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
    setOpenActionsId(null);
    setGlobalError('');
  };

  const handleEditSave = async (id: string) => {
    if (!editName.trim() || isSaving) return;
    setIsSaving(true);
    const ok = await onUpdateCategory(id, {
      name:  editName.trim(),
      icon:  editIcon,
      color: editColor,
    });
    setIsSaving(false);
    if (ok) {
      setEditingId(null);
    } else {
      setGlobalError('Не удалось сохранить изменения');
    }
  };

  const handleDelete = async (id: string) => {
    const count = objectCounts[id] ?? 0;
    if (count > 0) {
      setGlobalError(`Нельзя удалить: в категории ${count} активных объект(ов). Заархивируйте их сначала.`);
      setOpenActionsId(null);
      return;
    }
    const ok = await onDeleteCategory(id);
    setOpenActionsId(null);
    if (!ok) setGlobalError('Не удалось удалить категорию');
  };

  const handleAdd = async () => {
    if (!newName.trim() || isAdding) return;
    setIsAdding(true);
    setGlobalError('');
    const id = await onAddCategory(newName.trim(), newIcon, newColor);
    setIsAdding(false);
    if (id) {
      setShowAddForm(false);
      setNewName('');
      setNewIcon('📦');
      setNewColor('purple');
    } else {
      setGlobalError('Не удалось создать категорию');
    }
  };

  return (
    <div className="space-y-3">
      {/* Global error */}
      {globalError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{globalError}</span>
          <button onClick={() => setGlobalError('')} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Empty state */}
      {categories.length === 0 && !showAddForm && (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📦</p>
          <p className="font-semibold text-slate-700">Нет категорий</p>
          <p className="text-sm text-slate-400 mt-1">Добавьте первую категорию объектов</p>
        </div>
      )}

      {/* Category list */}
      {categories.map((cat, index) => {
        const catObjects  = activeObjects.filter((o) => o.categoryId === cat.id);
        const count       = catObjects.length;
        const payments    = catObjects.map((o) => getPaymentSummaryForSelection(o, periodSelection));
        const planned     = payments.reduce((s, p) => s + p.plannedRent, 0);
        const actual      = payments.reduce((s, p) => s + p.actualRent  + p.actualUtilities,  0);
        const pct         = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0;
        const catColor    = CAT_COLORS[cat.color]  ?? CAT_COLORS.blue;
        const barColor    = BAR_COLORS[cat.color]  ?? 'bg-slate-500';
        const isEditing   = editingId === cat.id;
        const isActionsOpen = openActionsId === cat.id;
        const canMoveUp   = index > 0;
        const canMoveDown = index < categories.length - 1;

        return (
          <div key={cat.id} className="bg-white rounded-2xl border border-[#ede9f4] overflow-hidden">
            {isEditing ? (
              /* ── Edit form ── */
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Редактировать категорию</p>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleEditSave(cat.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-full text-sm border border-[#ede9f4] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#967BB6] bg-white"
                  placeholder="Название категории"
                />
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setEditIcon(icon)}
                      disabled={isSaving}
                      className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        editIcon === icon ? 'bg-[#f0ebf8] ring-2 ring-[#967BB6]' : 'bg-slate-50 hover:bg-slate-100'
                      } disabled:opacity-50`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setEditColor(c.value)}
                      disabled={isSaving}
                      className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                        editColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                      } disabled:opacity-60`}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleEditSave(cat.id)}
                    disabled={isSaving}
                    className="flex-1 bg-[#967BB6] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#6d548c] disabled:opacity-60 transition-colors"
                  >
                    {isSaving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-5 py-2.5 border border-[#ede9f4] rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Category row ── */}
                <div className="relative">
                  <button
                    onClick={() => { setOpenActionsId(null); onSelectCategory(cat.id); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 pr-14 text-left active:bg-[#f8f5fd] transition-colors"
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${catColor.light}`}>
                      <span className="text-2xl leading-none">{cat.icon}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{cat.name}</p>
                        {count > 0 && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${catColor.light} ${catColor.text}`}>
                            {count}
                          </span>
                        )}
                      </div>
                      {planned > 0 ? (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-slate-700">{formatCurrency(actual)}</span>
                            <span className="text-[10px] text-slate-400">/ {formatCurrency(planned)}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{Math.round(pct)}%</span>
                          </div>
                          <div className="h-1.5 bg-[#f0ebf8] rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${barColor} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : count === 0 ? (
                        <p className="text-xs text-slate-400">Нет объектов</p>
                      ) : (
                        <p className="text-xs text-slate-400">Нет данных за период</p>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </button>

                  {/* Three-dots button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenActionsId(isActionsOpen ? null : cat.id);
                      setGlobalError('');
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${
                      isActionsOpen ? 'bg-[#f0ebf8] text-[#967BB6]' : 'hover:bg-slate-100 text-slate-400'
                    }`}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {/* ── Actions panel ── */}
                {isActionsOpen && (
                  <div className="border-t border-[#ede9f4] bg-[#faf9f6] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void onReorderCategory(cat.id, 'up').then(() => setOpenActionsId(null))}
                        disabled={!canMoveUp}
                        className="p-2.5 rounded-xl border border-[#ede9f4] bg-white text-slate-500 disabled:opacity-30 transition-colors hover:bg-[#f0ebf8] hover:text-[#967BB6]"
                        title="Переместить вверх"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        onClick={() => void onReorderCategory(cat.id, 'down').then(() => setOpenActionsId(null))}
                        disabled={!canMoveDown}
                        className="p-2.5 rounded-xl border border-[#ede9f4] bg-white text-slate-500 disabled:opacity-30 transition-colors hover:bg-[#f0ebf8] hover:text-[#967BB6]"
                        title="Переместить вниз"
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        onClick={() => handleEditStart(cat)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#ede9f4] bg-white text-slate-600 text-sm hover:bg-[#f0ebf8] hover:text-[#967BB6] transition-colors"
                      >
                        <Edit2 size={13} />
                        Изменить
                      </button>
                      <button
                        onClick={() => void handleDelete(cat.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-white text-red-500 text-sm hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Add category */}
      {!showAddForm ? (
        <button
          onClick={() => { setShowAddForm(true); setGlobalError(''); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#d8d0e8] text-[#967BB6] hover:border-[#967BB6] hover:bg-[#f0ebf8] transition-all font-medium text-sm"
        >
          <Plus size={18} />
          Добавить категорию
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ede9f4] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Новая категория</p>
            <button onClick={() => { setShowAddForm(false); setNewName(''); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); if (e.key === 'Escape') { setShowAddForm(false); setNewName(''); } }}
            placeholder="Название категории"
            className="w-full text-sm border border-[#ede9f4] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#967BB6] bg-white"
          />
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setNewIcon(icon)}
                disabled={isAdding}
                className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  newIcon === icon ? 'bg-[#f0ebf8] ring-2 ring-[#967BB6]' : 'bg-slate-50 hover:bg-slate-100'
                } disabled:opacity-50`}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNewColor(c.value)}
                disabled={isAdding}
                className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                  newColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                } disabled:opacity-60`}
                title={c.label}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={isAdding || !newName.trim()}
              className="flex-1 bg-[#967BB6] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#6d548c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? 'Создаём...' : 'Создать'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); }}
              className="px-5 py-2.5 border border-[#ede9f4] rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
