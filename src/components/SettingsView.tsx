import { useState, useEffect } from 'react';
import { AppState, User } from '../types';
import { api } from '../api/client';
import { Download, Upload, Trash2, Info, LogOut, Users, Plus, Pencil, X, Check, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  state: AppState;
  currentUser: User | null;
  onImport: (state: AppState) => Promise<void>;
  onReset: () => Promise<void>;
  onLogout: () => void;
}

// ─── User Management ──────────────────────────────────────────────────────────

interface UserFormData {
  phone: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
}

function UserRow({
  user,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  user: User;
  currentUserId: string;
  onUpdate: (id: string, data: Partial<UserFormData & { isActive: boolean }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMe = user.id === currentUserId;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Partial<UserFormData & { isActive: boolean }> = { name, role };
      if (password) updates.password = password;
      await onUpdate(user.id, updates);
      setPassword('');
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    await onUpdate(user.id, { isActive: !user.isActive });
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить пользователя ${user.phone}?`)) return;
    await onDelete(user.id);
  };

  return (
    <div className={`rounded-xl border p-3 ${user.isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
      {editing ? (
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Новый пароль (оставьте пустым чтобы не менять)"
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Check size={13} />
              Сохранить
            </button>
            <button
              onClick={() => { setEditing(false); setName(user.name); setRole(user.role); setPassword(''); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X size={13} />
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800 truncate">{user.name || '—'}</span>
              {user.role === 'admin' && (
                <ShieldCheck size={14} className="text-[#967BB6] flex-shrink-0" />
              )}
              {isMe && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Вы</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user.phone}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Редактировать"
            >
              <Pencil size={14} />
            </button>
            {!isMe && (
              <>
                <button
                  onClick={handleToggleActive}
                  className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${
                    user.isActive
                      ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                      : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                  }`}
                  title={user.isActive ? 'Деактивировать' : 'Активировать'}
                >
                  {user.isActive ? <X size={14} /> : <Check size={14} />}
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddUserForm({ onAdd }: { onAdd: (data: UserFormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onAdd({ phone, name, password, role });
      setPhone(''); setName(''); setPassword(''); setRole('user');
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#967BB6] text-white text-sm font-medium rounded-xl hover:bg-[#6d548c] transition-colors"
      >
        <Plus size={16} />
        Добавить пользователя
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#ede9f4] rounded-xl p-4 space-y-3 bg-[#faf9f6]">
      <p className="text-sm font-semibold text-slate-700">Новый пользователь</p>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Номер телефона"
        type="tel"
        required
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#967BB6]/40 bg-white"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя (необязательно)"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#967BB6]/40 bg-white"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль (минимум 6 символов)"
        type="password"
        required
        minLength={6}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#967BB6]/40 bg-white"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#967BB6]/40 bg-white"
      >
        <option value="user">Пользователь</option>
        <option value="admin">Администратор</option>
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Создание...' : 'Создать'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsView({ state, currentUser, onImport, onReset, onLogout }: SettingsViewProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      api.getUsers().then(setUsers).catch(console.error);
    }
  }, [currentUser]);

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

  const handleAddUser = async (data: { phone: string; name: string; password: string; role: 'admin' | 'user' }) => {
    const created = await api.createUser(data);
    setUsers((prev) => [...prev, created]);
  };

  const handleUpdateUser = async (id: string, data: Partial<{ name: string; password: string; role: 'admin' | 'user'; isActive: boolean }>) => {
    const updated = await api.updateUser(id, data);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
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

      {/* Users — только для admin */}
      {currentUser?.role === 'admin' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-700">Пользователи</h3>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                currentUserId={currentUser.id}
                onUpdate={handleUpdateUser}
                onDelete={handleDeleteUser}
              />
            ))}
          </div>
          <AddUserForm onAdd={handleAddUser} />
        </div>
      )}

      {/* Danger zone */}
      {currentUser?.role === 'admin' && (
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
      )}

      {/* Logout */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-1">Сессия</h3>
        {currentUser && (
          <p className="text-sm text-slate-400 mb-3">
            {currentUser.name ? `${currentUser.name} · ` : ''}{currentUser.phone}
            {currentUser.role === 'admin' && ' · Администратор'}
          </p>
        )}
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
