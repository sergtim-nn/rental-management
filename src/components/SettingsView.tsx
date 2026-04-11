import { AppState } from '../types';
import { Download, Upload, Trash2, Info, LogOut } from 'lucide-react';

interface SettingsViewProps {
  state: AppState;
  onImport: (state: AppState) => Promise<void>;
  onReset: () => Promise<void>;
  onLogout: () => void;
}

export default function SettingsView({ state, onImport, onReset, onLogout }: SettingsViewProps) {
  const handleExport = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renta_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as AppState;
          await onImport(parsed);
          alert('Данные успешно импортированы!');
        } catch {
          alert('Ошибка при импорте файла. Проверьте формат.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = async () => {
    if (window.confirm('Удалить ВСЕ данные? Это действие нельзя отменить.')) {
      await onReset();
    }
  };

  const totalObjects = state.objects.length;
  const totalHistoryRecords = state.objects.reduce((s, o) => s + o.paymentHistory.length, 0);
  const totalDocuments = state.objects.reduce((s, o) => s + o.documents.length, 0);
  const dataSize = (JSON.stringify(state).length / 1024).toFixed(1);

  return (
    <div className="space-y-6 max-w-xl">
      {/* Info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Info size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Статистика данных</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Объектов', value: totalObjects },
            { label: 'Записей истории', value: totalHistoryRecords },
            { label: 'Документов', value: totalDocuments },
            { label: 'Размер данных', value: `${dataSize} KB` },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-slate-800">{item.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-semibold text-slate-700">Резервная копия</h3>
        <p className="text-sm text-slate-500">
          Экспортируйте все данные в JSON-файл для резервного копирования. Вы можете импортировать их обратно в любое время.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Download size={16} />
            Экспорт данных
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Upload size={16} />
            Импорт данных
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
        <h3 className="font-semibold text-red-600 mb-3">Опасная зона</h3>
        <p className="text-sm text-slate-500 mb-4">
          Сброс удалит все объекты, историю платежей, документы и пользовательские категории. Действие необратимо.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
        >
          <Trash2 size={16} />
          Сбросить все данные
        </button>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-3">Сессия</h3>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          <LogOut size={16} />
          Выйти из системы
        </button>
      </div>

      {/* About */}
      <div className="text-center text-xs text-slate-400 pb-4">
        <p>РентаМенеджер v2.0</p>
        <p className="mt-1">Данные хранятся на сервере</p>
      </div>
    </div>
  );
}
