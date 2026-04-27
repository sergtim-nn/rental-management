import { ChevronDown } from 'lucide-react';
import { Field, inputCls } from './shared';

interface TenantSectionProps {
  tenantName: string;
  tenantPhoneDigits: string;
  telegramMode: 'phone' | 'login';
  telegramValue: string;
  onTenantNameChange: (v: string) => void;
  onTenantPhoneDigitsChange: (v: string) => void;
  onTelegramModeChange: (m: 'phone' | 'login') => void;
  onTelegramValueChange: (v: string) => void;
}

export default function TenantSection({
  tenantName,
  tenantPhoneDigits,
  telegramMode,
  telegramValue,
  onTenantNameChange,
  onTenantPhoneDigitsChange,
  onTelegramModeChange,
  onTelegramValueChange,
}: TenantSectionProps) {
  const toggleTelegramMode = () => {
    onTelegramModeChange(telegramMode === 'phone' ? 'login' : 'phone');
    onTelegramValueChange('');
  };

  const handleTelegramInput = (raw: string) => {
    if (telegramMode === 'phone') {
      onTelegramValueChange(raw.replace(/\D/g, '').slice(0, 10));
    } else {
      onTelegramValueChange(raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pb-3">
      <div className="sm:col-span-2">
        <Field label="ФИО арендатора">
          <input
            className={inputCls}
            value={tenantName}
            onChange={(e) => onTenantNameChange(e.target.value)}
            placeholder="Иванов Иван Иванович"
          />
        </Field>
      </div>

      <Field label="Телефон">
        <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent transition-all overflow-hidden">
          <span className="px-3 py-2.5 text-sm font-medium text-slate-500 bg-[#faf9f6] border-r border-[#ede9f4] select-none whitespace-nowrap">+7</span>
          <input
            className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
            value={tenantPhoneDigits}
            onChange={(e) => onTenantPhoneDigitsChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="999 000 00 00"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
      </Field>

      <Field label="Telegram">
        <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent transition-all overflow-hidden">
          <button
            type="button"
            onClick={toggleTelegramMode}
            title="Переключить тип"
            className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-[#967BB6] bg-[#faf9f6] border-r border-[#ede9f4] hover:bg-[#f0ebf8] transition-colors whitespace-nowrap select-none"
          >
            {telegramMode === 'phone' ? '+7' : '@'}
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          <input
            className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
            value={telegramValue}
            onChange={(e) => handleTelegramInput(e.target.value)}
            placeholder={telegramMode === 'phone' ? '999 000 00 00' : 'username'}
            inputMode={telegramMode === 'phone' ? 'numeric' : 'text'}
            maxLength={telegramMode === 'phone' ? 10 : 32}
          />
        </div>
      </Field>
    </div>
  );
}
