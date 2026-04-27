import { Banknote, CreditCard } from 'lucide-react';

export const inputCls = "w-full border border-[#ede9f4] rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#967BB6] focus:border-transparent transition-all bg-white";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function PaymentTypeToggle({
  value,
  onChange,
}: {
  value: 'cash' | 'card';
  onChange: (v: 'cash' | 'card') => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('cash')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all ${
          value === 'cash'
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        <Banknote size={14} /> Наличные
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all ${
          value === 'card'
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        <CreditCard size={14} /> Карта
      </button>
    </div>
  );
}
