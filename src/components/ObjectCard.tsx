import { RealEstateObject, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/notifications';
import {
  Phone,
  Send,
  MapPin,
  User,
  Calendar,
  ChevronRight,
  Archive,
  Edit2,
  Trash2,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ObjectCardProps {
  obj: RealEstateObject;
  category: Category | undefined;
  onClick: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<string, { header: string; badge: string; icon: string }> = {
  blue: {
    header: 'from-blue-600 to-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-500/20 text-blue-100',
  },
  green: {
    header: 'from-green-600 to-green-700',
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-500/20 text-green-100',
  },
  purple: {
    header: 'from-purple-600 to-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'bg-purple-500/20 text-purple-100',
  },
  orange: {
    header: 'from-orange-500 to-orange-600',
    badge: 'bg-orange-100 text-orange-700',
    icon: 'bg-orange-500/20 text-orange-100',
  },
  red: {
    header: 'from-red-600 to-red-700',
    badge: 'bg-red-100 text-red-700',
    icon: 'bg-red-500/20 text-red-100',
  },
  yellow: {
    header: 'from-yellow-500 to-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: 'bg-yellow-500/20 text-yellow-100',
  },
  pink: {
    header: 'from-pink-600 to-pink-700',
    badge: 'bg-pink-100 text-pink-700',
    icon: 'bg-pink-500/20 text-pink-100',
  },
  teal: {
    header: 'from-teal-600 to-teal-700',
    badge: 'bg-teal-100 text-teal-700',
    icon: 'bg-teal-500/20 text-teal-100',
  },
};

function getPaymentStatus(planned: number, actual: number): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  if (actual === 0 && planned > 0) {
    return {
      label: 'Не оплачено',
      color: 'text-red-600 bg-red-50',
      icon: <AlertCircle size={13} />,
    };
  }
  if (actual >= planned && planned > 0) {
    return {
      label: 'Оплачено',
      color: 'text-green-600 bg-green-50',
      icon: <CheckCircle2 size={13} />,
    };
  }
  if (actual > 0 && actual < planned) {
    return {
      label: 'Частично',
      color: 'text-yellow-600 bg-yellow-50',
      icon: <Clock size={13} />,
    };
  }
  return {
    label: '—',
    color: 'text-slate-400 bg-slate-50',
    icon: null,
  };
}

export default function ObjectCard({
  obj,
  category,
  onClick,
  onArchive,
  onRestore,
  onDelete,
}: ObjectCardProps) {
  const colors = CATEGORY_COLORS[category?.color ?? 'blue'] ?? CATEGORY_COLORS.blue;

  const totalPlanned = obj.plannedRent + obj.plannedUtilities;
  const totalActual = obj.currentPayment.actualRent + obj.currentPayment.actualUtilities;

  const rentStatus = getPaymentStatus(obj.plannedRent, obj.currentPayment.actualRent);
  const utilStatus = getPaymentStatus(obj.plannedUtilities, obj.currentPayment.actualUtilities);

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow ${obj.isArchived ? 'opacity-70' : ''}`}
    >
      {/* Card Header */}
      <div
        className={`bg-gradient-to-br ${colors.header} p-4 relative`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/20 text-white mb-2`}>
              <span>{category?.icon}</span>
              <span>{category?.name ?? 'Без категории'}</span>
            </span>
            <div className="flex items-center gap-1.5 text-white">
              <MapPin size={14} className="opacity-80 flex-shrink-0" />
              <p className="text-sm font-semibold leading-tight">
                {obj.street}, {obj.building}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {obj.documents.length > 0 && (
              <div className={`p-1.5 rounded-lg ${colors.icon}`}>
                <FileText size={14} />
              </div>
            )}
            <ChevronRight size={18} className="text-white/70" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 space-y-3">
        {/* Tenant */}
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-800 truncate">{obj.tenantName || '—'}</span>
        </div>

        {obj.tenantPhone && (
          <div className="flex items-center gap-2 flex-wrap">
            <Phone size={13} className="text-slate-400 flex-shrink-0" />
            <a
              href={`tel:${obj.tenantPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-slate-600 hover:text-blue-600 hover:underline transition-colors"
            >
              {obj.tenantPhone}
            </a>
            {obj.tenantTelegram && (
              <>
                <Send size={12} className="text-blue-400 ml-1 flex-shrink-0" />
                <a
                  href={
                    obj.tenantTelegram.startsWith('+')
                      ? `https://t.me/${obj.tenantTelegram}`
                      : `https://t.me/${obj.tenantTelegram.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  {obj.tenantTelegram}
                </a>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500">Договор: {formatDate(obj.contractDate)}</span>
        </div>

        {/* Payment Summary */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Аренда</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(obj.currentPayment.actualRent)} / {formatCurrency(obj.plannedRent)}</span>
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${rentStatus.color}`}>
                {rentStatus.icon}
                {rentStatus.label}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Коммунальные</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(obj.currentPayment.actualUtilities)} / {formatCurrency(obj.plannedUtilities)}</span>
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${utilStatus.color}`}>
                {utilStatus.icon}
                {utilStatus.label}
              </span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Итого</span>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(totalActual)} / {formatCurrency(totalPlanned)}</span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
        {obj.isArchived ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              <RotateCcw size={13} />
              Восстановить
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
              Удалить
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Edit2 size={13} />
              Открыть
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Archive size={13} />
              В архив
            </button>
          </>
        )}
      </div>
    </div>
  );
}
