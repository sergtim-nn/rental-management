import { RealEstateObject, Category } from '../types';
import { formatCurrency } from '../utils/notifications';
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
  onSelectCategory: (id: string) => void;
}

export default function Dashboard({ objects, categories, onSelectCategory }: DashboardProps) {
  const activeObjects = objects.filter((o) => !o.isArchived);
  const archivedObjects = objects.filter((o) => o.isArchived);

  const totalPlannedRent = activeObjects.reduce((s, o) => s + o.plannedRent, 0);
  const totalPlannedUtils = activeObjects.reduce((s, o) => s + o.plannedUtilities, 0);
  const totalActualRent = activeObjects.reduce((s, o) => s + o.currentPayment.actualRent, 0);
  const totalActualUtils = activeObjects.reduce((s, o) => s + o.currentPayment.actualUtilities, 0);
  const totalPlanned = totalPlannedRent + totalPlannedUtils;
  const totalActual = totalActualRent + totalActualUtils;
  const diff = totalActual - totalPlanned;

  const paid = activeObjects.filter(
    (o) =>
      o.currentPayment.actualRent >= o.plannedRent &&
      o.currentPayment.actualUtilities >= o.plannedUtilities &&
      o.plannedRent > 0
  ).length;
  const unpaid = activeObjects.filter(
    (o) => o.currentPayment.actualRent === 0 && o.plannedRent > 0
  ).length;
  const partial = activeObjects.filter(
    (o) =>
      o.currentPayment.actualRent > 0 &&
      o.currentPayment.actualRent < o.plannedRent
  ).length;

  const statCards = [
    {
      label: 'Активных объектов',
      value: activeObjects.length,
      icon: <Home size={22} />,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Всего арендаторов',
      value: activeObjects.filter((o) => o.tenantName).length,
      icon: <Users size={22} />,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      label: 'Плановый доход',
      value: formatCurrency(totalPlanned),
      icon: <DollarSign size={22} />,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
    {
      label: 'Фактический доход',
      value: formatCurrency(totalActual),
      icon: <TrendingUp size={22} />,
      color: diff >= 0 ? 'bg-emerald-500' : 'bg-red-500',
      textColor: diff >= 0 ? 'text-emerald-600' : 'text-red-600',
      bgLight: diff >= 0 ? 'bg-emerald-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bgLight} ${card.textColor} flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-4">Статус оплат (текущий период)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={24} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{paid}</p>
            <p className="text-xs text-slate-500">Оплачено</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Clock size={24} className="text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{partial}</p>
            <p className="text-xs text-slate-500">Частично</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-500">{unpaid}</p>
            <p className="text-xs text-slate-500">Не оплачено</p>
          </div>
        </div>

        {/* Progress bar */}
        {totalPlanned > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Собрано</span>
              <span>{Math.round((totalActual / totalPlanned) * 100)}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalActual / totalPlanned) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-green-600 font-medium">{formatCurrency(totalActual)}</span>
              <span className="text-slate-400">{formatCurrency(totalPlanned)}</span>
            </div>
          </div>
        )}
      </div>

      {/* By Category */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-4">По категориям</h3>
        <div className="space-y-3">
          {categories.map((cat) => {
            const catObjects = activeObjects.filter((o) => o.categoryId === cat.id);
            if (catObjects.length === 0) return null;
            const catPlanned = catObjects.reduce((s, o) => s + o.plannedRent + o.plannedUtilities, 0);
            const catActual = catObjects.reduce(
              (s, o) => s + o.currentPayment.actualRent + o.currentPayment.actualUtilities,
              0
            );
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
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
        <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-3">
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
