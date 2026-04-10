import { Notification, RealEstateObject, Category } from '../types';
import { formatDate } from '../utils/notifications';
import { Bell, AlertCircle, Clock, CheckCircle2, Settings2 } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  allObjects: RealEstateObject[];
  categories: Category[];
  notificationDaysBefore: number;
  onChangeNotificationDays: (days: number) => void;
  onObjectClick: (id: string) => void;
}

export default function NotificationsView({
  notifications,
  notificationDaysBefore,
  onChangeNotificationDays,
  onObjectClick,
}: NotificationsViewProps) {
  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Настройки уведомлений</h3>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-slate-600">Уведомлять за</span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 5, 7, 10, 14].map((d) => (
              <button
                key={d}
                onClick={() => onChangeNotificationDays(d)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  notificationDaysBefore === d
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d}д
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-600">до даты платежа</span>
        </div>
      </div>

      {/* Notifications list */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Предстоящие платежи</h3>
          {notifications.length > 0 && (
            <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <p className="text-slate-600 font-medium">Всё в порядке!</p>
            <p className="text-sm text-slate-400 mt-1">
              Нет предстоящих платежей в течение {notificationDaysBefore} дней
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, idx) => (
              <div
                key={idx}
                onClick={() => onObjectClick(notif.objectId)}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notif.daysLeft === 0
                      ? 'bg-red-100'
                      : notif.daysLeft <= 2
                      ? 'bg-orange-100'
                      : 'bg-yellow-100'
                  }`}
                >
                  {notif.daysLeft === 0 ? (
                    <AlertCircle size={20} className="text-red-500" />
                  ) : (
                    <Clock size={20} className={notif.daysLeft <= 2 ? 'text-orange-500' : 'text-yellow-500'} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {notif.objectAddress}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {notif.tenantName} · {notif.categoryName} ·{' '}
                    {notif.type === 'rent' ? 'Аренда' : 'Коммунальные'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-700">{formatDate(notif.dueDate)}</p>
                  <p
                    className={`text-xs font-medium ${
                      notif.daysLeft === 0
                        ? 'text-red-600'
                        : notif.daysLeft <= 2
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {notif.daysLeft === 0 ? 'Сегодня!' : `через ${notif.daysLeft} дн.`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
