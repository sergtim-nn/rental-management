import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setIsLoading(true);
    try {
      await onLogin(password);
    } catch {
      setError('Неверный пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
            <Lock size={24} className="text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">РентаМенеджер</h1>
        <p className="text-sm text-slate-400 text-center mb-6">Введите пароль для входа</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-slate-800 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
