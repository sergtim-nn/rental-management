import { RealEstateObject, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/notifications';
import {
  PeriodSelection,
  formatSelectionLabel,
  getPaymentSummaryForSelection,
} from '../utils/payments';
import {
  MapPin,
  User,
  Archive,
  Edit2,
  Trash2,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Send,
} from 'lucide-react';

interface ObjectCardProps {
  obj: RealEstateObject;
  category: Category | undefined;
  periodSelection: PeriodSelection;
  onClick: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

// Aura Ledger palette per category color
const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; strip: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   strip: 'bg-blue-500' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  strip: 'bg-green-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-[#967BB6]',  strip: 'bg-[#967BB6]' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', strip: 'bg-orange-500' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    strip: 'bg-red-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', strip: 'bg-yellow-500' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   dot: 'bg-pink-500',   strip: 'bg-pink-500' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-500',   strip: 'bg-teal-500' },
};

function getPaymentStatus(planned: number, actual: number): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  if (planned === 0 && actual === 0)
    return { label: 'Нет данных', color: 'text-slate-500 bg-slate-100', icon: <Clock size={11} /> };
  if (actual === 0 && planned > 0)
    return { label: 'Не оплачено', color: 'text-[#f4724e] bg-[#fdf0ec]', icon: <AlertCircle size={11} /> };
  if (actual >= planned && planned > 0)
    return { label: 'Оплачено', color: 'text-[#2ec4a9] bg-[#e6f9f6]', icon: <CheckCircle2 size={11} /> };
  if (actual > 0 && actual < planned)
    return { label: 'Частично', color: 'text-amber-600 bg-amber-50', icon: <Clock size={11} /> };
  return { label: '—', color: 'text-slate-400 bg-slate-50', icon: null };
}

export default function ObjectCard({
  obj,
  category,
  periodSelection,
  onClick,
  onArchive,
  onRestore,
  onDelete,
}: ObjectCardProps) {
  const colors = CATEGORY_COLORS[category?.color ?? 'blue'] ?? CATEGORY_COLORS.blue;
  const isParking = category?.id === 'parking';
  const payment = getPaymentSummaryForSelection(obj, periodSelection);

  const totalPlanned = isParking ? payment.plannedRent : payment.plannedRent + payment.plannedUtilities;
  const totalActual  = isParking ? payment.actualRent  : payment.actualRent + payment.actualUtilities;
  const overallStatus = getPaymentStatus(totalPlanned, totalActual);

  return (
    <div
      className={`bg-white rounded-2xl border border-[#ede9f4] overflow-hidden flex flex-col hover:shadow-md hover:border-[#c9bedd] transition-all duration-200 cursor-pointer ${obj.isArchived ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {/* Top colour strip */}
      <div className={`h-1.5 w-full ${colors.strip}`} />

      {/* Body */}
      <div className="px-3 pt-3 pb-2 flex-1 space-y-2">
        {/* Category + status row */}
        <div className="flex items-center justify-between gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            <span className="text-[10px] leading-none">{category?.icon}</span>
            {category?.name ?? 'Без категории'}
          </span>
          <div className="flex items-center gap-1">
            {obj.documents.length > 0 && (
              <span className="p-0.5 rounded text-slate-400">
                <FileText size={11} />
              </span>
            )}
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${overallStatus.color}`}>
              {overallStatus.icon}
              {overallStatus.label}
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="text-[#967BB6] flex-shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
            {obj.street}{obj.building ? `, ${obj.building}` : ''}
          </p>
        </div>

        {/* Tenant */}
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-600 truncate">{obj.tenantName || '—'}</span>
        </div>

        {/* Contact row — phone + telegram compact */}
        {(obj.tenantPhone || obj.tenantTelegram) && (
          <div className="flex items-center gap-2 flex-wrap">
            {obj.tenantPhone && (
              <a
                href={`tel:${obj.tenantPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#967BB6] transition-colors"
              >
                <Phone size={10} />
                {obj.tenantPhone}
              </a>
            )}
            {obj.tenantTelegram && (
              <a
                href={obj.tenantTelegram.startsWith('+')
                  ? `https://t.me/${obj.tenantTelegram}`
                  : `https://t.me/${obj.tenantTelegram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
              >
                <Send size={10} />
                {obj.tenantTelegram}
              </a>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#ede9f4]" />

        {/* Financials */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 leading-none">
              {formatSelectionLabel(periodSelection)}
            </p>
            {obj.contractDate && (
              <p className="text-[10px] text-slate-400">{formatDate(obj.contractDate)}</p>
            )}
          </div>
          {/* Rent row */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-slate-500 shrink-0">Аренда</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-800">{formatCurrency(payment.actualRent)}</span>
              {payment.plannedRent > 0 && (
                <span className="text-[10px] text-slate-400">/ {formatCurrency(payment.plannedRent)}</span>
              )}
            </div>
          </div>
          {/* Utilities row — only if present */}
          {!isParking && (payment.plannedUtilities > 0 || payment.actualUtilities > 0) && (
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-slate-500 shrink-0">Коммун.</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-800">{formatCurrency(payment.actualUtilities)}</span>
                {payment.plannedUtilities > 0 && (
                  <span className="text-[10px] text-slate-400">/ {formatCurrency(payment.plannedUtilities)}</span>
                )}
              </div>
            </div>
          )}
          {/* Total row when there are two payment types */}
          {!isParking && (payment.plannedUtilities > 0 || payment.actualUtilities > 0) && (
            <div className="flex items-center justify-between gap-1 border-t border-[#ede9f4] pt-1">
              <span className="text-[10px] text-slate-400 shrink-0">Итого</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-800">{formatCurrency(totalActual)}</span>
                {totalPlanned > 0 && (
                  <span className="text-[10px] text-slate-400">/ {formatCurrency(totalPlanned)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-3 py-2 border-t border-[#ede9f4] flex items-center justify-end gap-1">
        {obj.isArchived ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              title="Восстановить"
              className="flex items-center gap-1 text-[10px] text-[#2ec4a9] hover:text-teal-700 font-semibold px-2 py-1 rounded-full hover:bg-[#e6f9f6] transition-colors"
            >
              <RotateCcw size={11} />
              Восстановить
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Удалить"
              className="flex items-center gap-1 text-[10px] text-[#f4724e] hover:text-red-700 font-semibold px-2 py-1 rounded-full hover:bg-[#fdf0ec] transition-colors"
            >
              <Trash2 size={11} />
              Удалить
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              title="Открыть"
              className="flex items-center gap-1 text-[10px] text-[#967BB6] hover:text-[#6d548c] font-semibold px-2 py-1 rounded-full hover:bg-[#f0ebf8] transition-colors"
            >
              <Edit2 size={11} />
              Открыть
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
              title="В архив"
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Archive size={11} />
              Архив
            </button>
          </>
        )}
      </div>
    </div>
  );
}
