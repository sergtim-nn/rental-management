import { RealEstateObject, Category } from '../types';
import { formatCurrency } from '../utils/notifications';
import {
  PeriodSelection,
  formatSelectionLabel,
  getPaymentSummaryForSelection,
} from '../utils/payments';
import {
  TrendingUp,
  Home,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';

interface DashboardProps {
  objects: RealEstateObject[];
  categories: Category[];
  periodSelection: PeriodSelection;
  onSelectCategory: (id: string) => void;
}

export default function Dashboard({ objects, categories, periodSelection, onSelectCategory }: DashboardProps) {
  const activeObjects = objects.filter((o) => !o.isArchived);
  const archivedObjects = objects.filter((o) => o.isArchived);
  const objectSnapshots = activeObjects.map((obj) => ({
    obj,
    payment: getPaymentSummaryForSelection(obj, periodSelection),
  }));

  const totalPlannedRent = objectSnapshots.reduce((s, item) => s + item.payment.plannedRent, 0);
  const totalPlannedUtils = objectSnapshots.reduce((s, item) => s + item.payment.plannedUtilities, 0);
  const totalActualRent = objectSnapshots.reduce((s, item) => s + item.payment.actualRent, 0);
  const totalActualUtils = objectSnapshots.reduce((s, item) => s + item.payment.actualUtilities, 0);
  const totalPlanned = totalPlannedRent + totalPlannedUtils;
  const totalActual = totalActualRent + totalActualUtils;
  const diff = totalActual - totalPlanned;

  const paid = objectSnapshots.filter(
    ({ payment }) =>
      payment.hasData &&
      payment.actualRent >= payment.plannedRent &&
      payment.actualUtilities >= payment.plannedUtilities &&
      payment.plannedRent > 0
  ).length;
  const unpaid = objectSnapshots.filter(
    ({ payment }) => payment.hasData && payment.actualRent === 0 && payment.plannedRent > 0
  ).length;
  const partial = objectSnapshots.filter(
    ({ payment }) =>
      payment.hasData &&
      payment.actualRent > 0 &&
      payment.actualRent < payment.plannedRent
  ).length;
  const noData = objectSnapshots.filter(({ payment }) => !payment.hasData).length;

  const statCards = [
    {
      label: 'Активных объектов',
      value: activeObjects.length,
      icon: <Home size={20} />,
      textColor: 'text-[#967BB6]',
      bgLight: 'bg-[#f0ebf8]',
    },
    {
      label: 'Всего арендаторов',
      value: activeObjects.filter((o) => o.tenantName).length,
      icon: <Users size={20} />,
      textColor: 'text-[#2ec4a9]',
      bgLight: 'bg-[#e6f9f6]',
    },
    {
      label: 'Плановый доход',
      value: formatCurrency(totalPlanned),
      icon: <DollarSign size={20} />,
      textColor: 'text-slate-500',
      bgLight: 'bg-slate-100',
    },
    {
      label: 'Фактический доход',
      value: formatCurrency(totalActual),
      icon: <TrendingUp size={20} />,
      textColor: diff >= 0 ? 'text-[#2ec4a9]' : 'text-[#f4724e]',
      bgLight: diff >= 0 ? 'bg-[#e6f9f6]' : 'bg-[#fdf0ec]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-3xl p-5 shadow-sm border border-[#ede9f4]">
            <div className={`w-10 h-10 rounded-2xl ${card.bgLight} ${card.textColor} flex items-center justify-center mb-4`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ede9f4]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800">Статус платежей</h3>
            <p className="text-xs text-slate-400 mt-0.5">Период: {formatSelectionLabel(periodSelection)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#e6f9f6] rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <CheckCircle2 size={20} className="text-[#2ec4a9]" />
            </div>
            <p className="text-2xl font-bold text-[#2ec4a9]">{paid}</p>
            <p className="text-xs text-slate-500 mt-0.5">Оплачено</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Clock size={20} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-500">{partial}</p>
            <p className="text-xs text-slate-500 mt-0.5">Частично</p>
          </div>
          <div className="bg-[#fdf0ec] rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <AlertCircle size={20} className="text-[#f4724e]" />
            </div>
            <p className="text-2xl font-bold text-[#f4724e]">{unpaid}</p>
            <p className="text-xs text-slate-500 mt-0.5">Не оплачено</p>
          </div>
          <div className="bg-slate-100 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Clock size={20} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-500">{noData}</p>
            <p className="text-xs text-slate-500 mt-0.5">Нет данных</p>
          </div>
        </div>

        {/* Progress bar */}
        {totalPlanned > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Собрано</span>
              <span className="font-semibold text-slate-600">{Math.round((totalActual / totalPlanned) * 100)}%</span>
            </div>
            <div className="h-2 bg-[#f0ebf8] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (totalActual / totalPlanned) * 100)}%`,
                  background: 'linear-gradient(90deg, #2ec4a9, #967BB6)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-[#2ec4a9] font-semibold">{formatCurrency(totalActual)}</span>
              <span className="text-slate-400">{formatCurrency(totalPlanned)}</span>
            </div>
          </div>
        )}
      </div>

      {/* By Category */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ede9f4]">
        <h3 className="font-bold text-slate-800 mb-5">По категориям</h3>
        <div className="space-y-3">
          {categories.map((cat) => {
            const catObjects = activeObjects.filter((o) => o.categoryId === cat.id);
            if (catObjects.length === 0) return null;
            const catSnapshots = catObjects.map((obj) => getPaymentSummaryForSelection(obj, periodSelection));
            const catPlanned = catSnapshots.reduce((s, payment) => s + payment.plannedRent + payment.plannedUtilities, 0);
            const catActual = catSnapshots.reduce((s, payment) => s + payment.actualRent + payment.actualUtilities, 0);
            const pct = catPlanned > 0 ? (catActual / catPlanned) * 100 : 0;

            const barColors: Record<string, string> = {
              blue: 'bg-blue-500',
              green: 'bg-green-500',
              purple: 'bg-purple-500',
              orange: 'bg-orange-500',
              red: 'bg-red-500',
              yellow: 'bg-yellow-500',
              pink: 'bg-pink-500',
              teal: 'bg-teal-500',
            };

            return (
              <div
                key={cat.id}
                className="cursor-pointer hover:bg-slate-50 rounded-xl p-2 -mx-2 transition-colors"
                onClick={() => onSelectCategory(cat.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    <span className="text-xs text-slate-400">({catObjects.length} объ.)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-800">{formatCurrency(catActual)}</span>
                    <span className="text-xs text-slate-400"> / {formatCurrency(catPlanned)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#f0ebf8] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColors[cat.color] ?? 'bg-slate-500'} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {activeObjects.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Нет активных объектов</p>
          )}
        </div>
      </div>

      {/* Archive info */}
      {archivedObjects.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-[#ede9f4] flex items-center gap-3">
          <span className="text-2xl">📁</span>
          <div>
            <p className="text-sm font-medium text-slate-700">В архиве: {archivedObjects.length} объект(ов)</p>
            <p className="text-xs text-slate-500">Перейдите в раздел «Архив» для просмотра</p>
          </div>
        </div>
      )}
    </div>
  );
}
