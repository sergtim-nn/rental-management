import { useState } from 'react';
import { RealEstateObject, Category, PaymentRecord } from '../types';
import { formatCurrency, formatDate, formatPeriod } from '../utils/notifications';
import { emptyCurrentPayment } from '../store/storage';
import DocumentsSection from './object-modal/DocumentsSection';
import {
  X,
  Save,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  History,
  CreditCard,
  Banknote,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface ObjectModalProps {
  obj: RealEstateObject | null;
  categories: Category[];
  isNew: boolean;
  defaultCategoryId: string;
  onSave: (data: Partial<RealEstateObject>) => void;
  onClose: () => void;
  onAddDocument: (file: File) => void;
  onRemoveDocument: (docId: string) => void;
  onSaveToHistory: (
    period: string,
    paymentDraft: {
      plannedRent: number;
      currentPayment: RealEstateObject['currentPayment'];
    }
  ) => void;
  onUpdateHistoryRecord: (
    objectId: string,
    recordId: string,
    updates: Partial<PaymentRecord>
  ) => void;
  onDeleteHistoryRecord: (objectId: string, recordId: string) => Promise<boolean>;
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function SectionHeader({ title, icon, expanded, onToggle }: {
  title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-3 border-b border-[#ede9f4] text-left"
    >
      <span className="text-[#967BB6]">{icon}</span>
      <span className="font-semibold text-slate-700 flex-1">{title}</span>
      {expanded ? <ChevronUp size={16} className="text-[#967BB6]" /> : <ChevronDown size={16} className="text-slate-400" />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-[#ede9f4] rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#967BB6] focus:border-transparent transition-all bg-white";

function PaymentTypeToggle({
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

export default function ObjectModal({
  obj,
  categories,
  isNew,
  defaultCategoryId,
  onSave,
  onClose,
  onAddDocument,
  onRemoveDocument,
  onSaveToHistory,
  onUpdateHistoryRecord,
  onDeleteHistoryRecord,
}: ObjectModalProps) {
  // Form state
  const [categoryId, setCategoryId] = useState(obj?.categoryId ?? defaultCategoryId);
  const [street, setStreet] = useState(obj?.street ?? '');
  const [building, setBuilding] = useState(obj?.building ?? '');
  const [tenantName, setTenantName] = useState(obj?.tenantName ?? '');
  const [tenantPhoneDigits, setTenantPhoneDigits] = useState(() => {
    const p = obj?.tenantPhone ?? '';
    const digits = p.replace(/\D/g, '');
    if ((digits.startsWith('7') || digits.startsWith('8')) && digits.length === 11) return digits.slice(1);
    return digits.slice(0, 10);
  });
  const [telegramMode, setTelegramMode] = useState<'phone' | 'login'>(() => {
    const t = obj?.tenantTelegram ?? '';
    return t.startsWith('+') ? 'phone' : 'login';
  });
  const [telegramValue, setTelegramValue] = useState(() => {
    const t = obj?.tenantTelegram ?? '';
    if (t.startsWith('+7')) return t.slice(2).replace(/\D/g, '').slice(0, 10);
    if (t.startsWith('@')) return t.slice(1);
    return t;
  });
  const isParking = categoryId === 'parking';
  const [contractDate, setContractDate] = useState(obj?.contractDate ?? '');
  const [plannedRent, setPlannedRent] = useState(obj?.plannedRent ?? 0);

  // Current payment
  const cp = obj?.currentPayment ?? emptyCurrentPayment();
  // Pre-populate plannedUtilities from history for the util period (previous month)
  // so it persists after currentPayment is reset on save
  const [plannedUtilities, setPlannedUtilities] = useState(() => {
    if ((cp.plannedUtilities ?? 0) > 0) return cp.plannedUtilities!;
    const now2 = new Date();
    const pm = now2.getMonth() === 0 ? 11 : now2.getMonth() - 1;
    const py = now2.getMonth() === 0 ? now2.getFullYear() - 1 : now2.getFullYear();
    const utilPeriodStr = `${py}-${String(pm + 1).padStart(2, '0')}`;
    const histRecs = (obj?.paymentHistory ?? []).filter((r) => r.period === utilPeriodStr);
    return histRecs.reduce((max, r) => Math.max(max, r.plannedUtilities ?? 0), 0);
  });
  const today = new Date().toISOString().split('T')[0];
  const [actualRent, setActualRent] = useState(cp.actualRent);
  const [rentPaymentDate, setRentPaymentDate] = useState(cp.rentPaymentDate || today);
  const [rentPaymentType, setRentPaymentType] = useState<'cash' | 'card'>(cp.rentPaymentType);
  const [actualUtilities, setActualUtilities] = useState(cp.actualUtilities);
  const [utilitiesPaymentDate, setUtilitiesPaymentDate] = useState(cp.utilitiesPaymentDate || today);
  const [utilitiesPaymentType, setUtilitiesPaymentType] = useState<'cash' | 'card'>(cp.utilitiesPaymentType);
  const [note, setNote] = useState(cp.note ?? '');

  // Period for history save — аренда: текущий месяц, коммуналка: предыдущий
  const now = new Date();
  const prevMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [rentHistoryYear, setRentHistoryYear] = useState(now.getFullYear());
  const [rentHistoryMonth, setRentHistoryMonth] = useState(now.getMonth()); // 0-indexed
  const [utilHistoryYear, setUtilHistoryYear] = useState(prevMonthYear);
  const [utilHistoryMonth, setUtilHistoryMonth] = useState(prevMonthIdx); // 0-indexed

  // UI sections
  const [showAddress, setShowAddress] = useState(true);
  const [showTenant, setShowTenant] = useState(true);
  const [showContract, setShowContract] = useState(true);
  const [showPayment, setShowPayment] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [savedPaymentMessage, setSavedPaymentMessage] = useState<string | null>(null);

  const handleSave = () => {
    if (contractDate && contractDate > today) {
      window.alert('Дата заключения договора не может быть в будущем');
      return;
    }
    const data: Partial<RealEstateObject> = {
      categoryId,
      street,
      building,
      tenantName,
      tenantPhone: tenantPhoneDigits ? `+7${tenantPhoneDigits}` : '',
      tenantTelegram: telegramMode === 'phone'
        ? (telegramValue ? `+7${telegramValue}` : '')
        : (telegramValue ? `@${telegramValue}` : ''),
      contractDate,
      plannedRent,
      currentPayment: {
        date: today,
        actualRent,
        rentPaymentDate,
        rentPaymentType,
        plannedUtilities,
        actualUtilities,
        utilitiesPaymentDate,
        utilitiesPaymentType,
        note,
      },
    };
    onSave(data);
  };

  const handleSavePaymentToHistory = (kind: 'rent' | 'utilities') => {
    const year  = kind === 'rent' ? rentHistoryYear  : utilHistoryYear;
    const month = kind === 'rent' ? rentHistoryMonth : utilHistoryMonth;
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;
    const paymentDate = kind === 'rent' ? rentPaymentDate : utilitiesPaymentDate;
    if (paymentDate && paymentDate > today) {
      window.alert('Дата оплаты не может быть в будущем');
      return;
    }
    onSaveToHistory(period, {
      plannedRent: kind === 'rent' ? plannedRent : 0,
      currentPayment: {
        date: kind === 'rent' ? (rentPaymentDate || today) : (utilitiesPaymentDate || today),
        actualRent: kind === 'rent' ? actualRent : 0,
        rentPaymentDate: kind === 'rent' ? rentPaymentDate : '',
        rentPaymentType,
        plannedUtilities: kind === 'utilities' ? plannedUtilities : 0,
        actualUtilities: kind === 'utilities' ? actualUtilities : 0,
        utilitiesPaymentDate: kind === 'utilities' ? utilitiesPaymentDate : '',
        utilitiesPaymentType,
        note,
      },
    });
    setSavedPaymentMessage(`${kind === 'rent' ? 'Аренда' : 'Коммунальные'} за ${formatPeriod(period)} сохранены`);
    if (kind === 'rent') {
      setActualRent(0);
      setRentPaymentDate(today);
    } else {
      setPlannedUtilities(0);
      setActualUtilities(0);
      setUtilitiesPaymentDate(today);
      setUtilHistoryMonth(prevMonthIdx);
      setUtilHistoryYear(prevMonthYear);
    }
    setTimeout(() => setSavedPaymentMessage(null), 3000);
  };

  const totalPlanned = plannedRent;
  const totalActual = isParking ? actualRent : actualRent + actualUtilities;
  const diff = totalActual - totalPlanned;
  const canSaveRentPayment = actualRent > 0;
  const canSaveUtilitiesPayment = plannedUtilities > 0 || actualUtilities > 0;

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-[#faf9f6] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white rounded-t-2xl border-b border-[#ede9f4]">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">
              {isNew ? 'Новый объект' : `${obj?.street}, ${obj?.building}`}
            </h2>
            {!isNew && (
              <p className="text-xs text-slate-400">
                История: {obj?.paymentHistory.length} записей · Документы: {obj?.documents.length}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f0ebf8] rounded-xl text-slate-400 hover:text-[#967BB6] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">

          {/* Category */}
          <Field label="Категория">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Address Section */}
          <SectionHeader
            title="Адрес объекта"
            icon={<MapPin size={16} />}
            expanded={showAddress}
            onToggle={() => setShowAddress(!showAddress)}
          />
          {showAddress && (
            <div className="grid grid-cols-2 gap-3 pt-2 pb-3">
              <Field label="Улица">
                <input className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="ул. Ленина" />
              </Field>
              <Field label="Дом / корпус">
                <input className={inputCls} value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="12А" />
              </Field>
            </div>
          )}

          {/* Tenant Section */}
          <SectionHeader
            title="Арендатор"
            icon={<User size={16} />}
            expanded={showTenant}
            onToggle={() => setShowTenant(!showTenant)}
          />
          {showTenant && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pb-3">
              <div className="sm:col-span-2">
                <Field label="ФИО арендатора">
                  <input className={inputCls} value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Иванов Иван Иванович" />
                </Field>
              </div>
              <Field label="Телефон">
                <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent transition-all overflow-hidden">
                  <span className="px-3 py-2.5 text-sm font-medium text-slate-500 bg-[#faf9f6] border-r border-[#ede9f4] select-none whitespace-nowrap">+7</span>
                  <input
                    className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
                    value={tenantPhoneDigits}
                    onChange={(e) => setTenantPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                    onClick={() => { setTelegramMode(telegramMode === 'phone' ? 'login' : 'phone'); setTelegramValue(''); }}
                    title="Переключить тип"
                    className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-[#967BB6] bg-[#faf9f6] border-r border-[#ede9f4] hover:bg-[#f0ebf8] transition-colors whitespace-nowrap select-none"
                  >
                    {telegramMode === 'phone' ? '+7' : '@'}
                    <ChevronDown size={11} className="text-slate-400" />
                  </button>
                  <input
                    className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
                    value={telegramValue}
                    onChange={(e) => {
                      if (telegramMode === 'phone') {
                        setTelegramValue(e.target.value.replace(/\D/g, '').slice(0, 10));
                      } else {
                        setTelegramValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32));
                      }
                    }}
                    placeholder={telegramMode === 'phone' ? '999 000 00 00' : 'username'}
                    inputMode={telegramMode === 'phone' ? 'numeric' : 'text'}
                    maxLength={telegramMode === 'phone' ? 10 : 32}
                  />
                </div>
              </Field>
            </div>
          )}

          {/* Contract Section */}
          <SectionHeader
            title="Условия договора"
            icon={<Calendar size={16} />}
            expanded={showContract}
            onToggle={() => setShowContract(!showContract)}
          />
          {showContract && (
            <div className="grid grid-cols-1 gap-3 pt-2 pb-3 sm:grid-cols-2">
              <Field label="Дата заключения договора">
                <input type="date" className={inputCls} max={today} value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
              </Field>
              <Field label="Плановая аренда (₽)">
                <input type="number" step="0.01" min="0" className={inputCls} value={plannedRent || ''} onChange={(e) => setPlannedRent(Number(e.target.value))} placeholder="0" />
              </Field>
            </div>
          )}

          {/* Current Payment Section */}
          <SectionHeader
            title="Текущие платежи"
            icon={<DollarSign size={16} />}
            expanded={showPayment}
            onToggle={() => setShowPayment(!showPayment)}
          />
          {showPayment && (
            <div className="pt-2 pb-3 space-y-4">
              {/* Rent */}
              <div className="bg-white rounded-xl p-4 border border-[#ede9f4] space-y-3">
                <p className="text-xs font-semibold text-[#967BB6] uppercase tracking-wider">Аренда</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Плановая сумма">
                    <div className="px-3 py-2.5 bg-[#faf9f6] border border-[#ede9f4] rounded-xl text-sm font-semibold text-slate-700">{formatCurrency(plannedRent)}</div>
                  </Field>
                  <Field label="Фактическая оплата (₽)">
                    <input type="number" step="0.01" min="0" className={inputCls} value={actualRent || ''} onChange={(e) => setActualRent(Number(e.target.value))} placeholder="0" />
                  </Field>
                </div>
                <Field label="Дата оплаты">
                  <input type="date" className={inputCls} value={rentPaymentDate} onChange={(e) => setRentPaymentDate(e.target.value)} />
                </Field>
                <Field label="Способ оплаты">
                  <PaymentTypeToggle value={rentPaymentType} onChange={setRentPaymentType} />
                </Field>
                {!isNew && (
                  <div className="rounded-xl border border-[#d8d0e8] bg-[#f0ebf8] p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                      <Field label="Месяц">
                        <select
                          value={rentHistoryMonth}
                          onChange={(e) => setRentHistoryMonth(Number(e.target.value))}
                          className={inputCls}
                        >
                          {MONTHS_RU.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Год">
                        <select
                          value={rentHistoryYear}
                          onChange={(e) => setRentHistoryYear(Number(e.target.value))}
                          className={inputCls}
                        >
                          {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </Field>
                      <button
                        type="button"
                        onClick={() => handleSavePaymentToHistory('rent')}
                        disabled={!canSaveRentPayment}
                        className="rounded-xl bg-[#967BB6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d548c] disabled:cursor-not-allowed disabled:bg-[#c9bedd]"
                      >
                        Сохранить аренду
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Utilities */}
              {!isParking && (
                <div className="bg-white rounded-xl p-4 border border-[#ede9f4] space-y-3">
                  <p className="text-xs font-semibold text-[#967BB6] uppercase tracking-wider">Коммунальные платежи</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Сумма по счёту (₽)">
                      <input type="number" step="0.01" min="0" className={inputCls} value={plannedUtilities || ''} onChange={(e) => setPlannedUtilities(Number(e.target.value))} placeholder="0" />
                    </Field>
                    <Field label="Фактически оплачено (₽)">
                      <input type="number" step="0.01" min="0" className={inputCls} value={actualUtilities || ''} onChange={(e) => setActualUtilities(Number(e.target.value))} placeholder="0" />
                    </Field>
                  </div>
                  <Field label="Дата оплаты">
                    <input type="date" className={inputCls} value={utilitiesPaymentDate} onChange={(e) => setUtilitiesPaymentDate(e.target.value)} />
                  </Field>
                  <Field label="Способ оплаты">
                    <PaymentTypeToggle value={utilitiesPaymentType} onChange={setUtilitiesPaymentType} />
                  </Field>
                  {!isNew && (
                    <div className="rounded-xl border border-[#d8d0e8] bg-[#f0ebf8] p-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                        <Field label="Месяц">
                          <select
                            value={utilHistoryMonth}
                            onChange={(e) => setUtilHistoryMonth(Number(e.target.value))}
                            className={inputCls}
                          >
                            {MONTHS_RU.map((m, i) => (
                              <option key={i} value={i}>{m}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Год">
                          <select
                            value={utilHistoryYear}
                            onChange={(e) => setUtilHistoryYear(Number(e.target.value))}
                            className={inputCls}
                          >
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </Field>
                        <button
                          type="button"
                          onClick={() => handleSavePaymentToHistory('utilities')}
                          disabled={!canSaveUtilitiesPayment}
                          className="rounded-xl bg-[#967BB6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d548c] disabled:cursor-not-allowed disabled:bg-[#c9bedd]"
                        >
                          Сохранить коммунальные
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="bg-[#2d2040] rounded-xl p-4 text-white">
                <p className="text-xs font-semibold text-[#c9bedd] uppercase tracking-wider mb-3">Итог текущего периода</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-[#c9bedd] mb-1">Плановый</p>
                    <p className="text-lg font-bold">{formatCurrency(totalPlanned)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#c9bedd] mb-1">Фактический</p>
                    <p className="text-lg font-bold">{formatCurrency(totalActual)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#c9bedd] mb-1">Разница</p>
                    <p className={`text-lg font-bold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <Field label="Примечание">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Дополнительные заметки..."
                />
              </Field>

              {savedPaymentMessage && (
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  <CheckCircle2 size={13} />
                  {savedPaymentMessage}
                </div>
              )}
            </div>
          )}

          {/* History Section */}
          {!isNew && (
            <>
              <SectionHeader
                title={`История платежей (${obj?.paymentHistory.length ?? 0})`}
                icon={<History size={16} />}
                expanded={showHistory}
                onToggle={() => setShowHistory(!showHistory)}
              />
              {showHistory && (
                <div className="pt-2 pb-3 space-y-2">
                  {(obj?.paymentHistory.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">История пуста</p>
                  ) : (
                    groupByPeriod(obj?.paymentHistory ?? []).map(({ period, records }) => (
                      <MonthGroup
                        key={period}
                        period={period}
                        records={records}
                        isParking={isParking}
                        onSave={(recordId, updates) => {
                          if (!obj) return;
                          onUpdateHistoryRecord(obj.id, recordId, updates);
                        }}
                        onDelete={async (recordId) => {
                          if (!obj) return false;
                          return onDeleteHistoryRecord(obj.id, recordId);
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* Documents Section */}
          {!isNew && (
            <>
              <SectionHeader
                title={`Документы (${obj?.documents.length ?? 0})`}
                icon={<FileText size={16} />}
                expanded={showDocs}
                onToggle={() => setShowDocs(!showDocs)}
              />
              {showDocs && (
                <DocumentsSection
                  documents={obj?.documents ?? []}
                  onAdd={onAddDocument}
                  onRemove={onRemoveDocument}
                />
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 bg-white rounded-b-2xl border-t border-[#ede9f4] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#ede9f4] text-sm font-medium text-slate-600 hover:bg-[#f0ebf8] transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#967BB6] text-white text-sm font-semibold hover:bg-[#6d548c] transition-colors shadow-sm shadow-[#967BB6]/30"
          >
            <Save size={16} />
            {isNew ? 'Создать объект' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByPeriod(records: PaymentRecord[]): Array<{ period: string; records: PaymentRecord[] }> {
  const map = new Map<string, PaymentRecord[]>();
  for (const r of records) {
    const arr = map.get(r.period) ?? [];
    arr.push(r);
    map.set(r.period, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([period, recs]) => ({ period, records: recs }));
}

type PeriodStatus = 'paid' | 'partial' | 'unpaid' | 'nodata';

function getPeriodStatus(records: PaymentRecord[], isParking: boolean): PeriodStatus {
  const rentRecords = records.filter(r => r.actualRent > 0);
  const utilRecords = records.filter(r => r.actualUtilities > 0 || r.plannedUtilities > 0);
  const totalActualRent = rentRecords.reduce((s, r) => s + r.actualRent, 0);
  const plannedRent = records.find(r => r.plannedRent > 0)?.plannedRent ?? 0;
  const totalActualUtils = isParking ? 0 : utilRecords.reduce((s, r) => s + r.actualUtilities, 0);
  const totalPlannedUtils = isParking ? 0 : Math.max(0, ...utilRecords.map(r => r.plannedUtilities ?? 0));
  const totalActual = totalActualRent + totalActualUtils;
  const totalPlanned = plannedRent + totalPlannedUtils;
  if (totalActual === 0 && totalPlanned === 0) return 'nodata';
  if (totalActual === 0) return 'unpaid';
  if (totalActual < totalPlanned) return 'partial';
  return 'paid';
}

function StatusChip({ status, small }: { status: PeriodStatus | 'pending'; small?: boolean }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Оплачено',    cls: 'bg-emerald-100 text-emerald-700' },
    partial: { label: 'Частично',    cls: 'bg-amber-100 text-amber-700' },
    unpaid:  { label: 'Не оплачено', cls: 'bg-red-100 text-red-600' },
    nodata:  { label: 'Нет данных',  cls: 'bg-slate-100 text-slate-500' },
    pending: { label: 'Ожидает',     cls: 'bg-blue-100 text-blue-600' },
  };
  const { label, cls } = cfg[status];
  return <span className={`font-semibold rounded-full ${small ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5'} ${cls}`}>{label}</span>;
}

// ── Document type ─────────────────────────────────────────────────────────────

type DocType = 'rent' | 'bill' | 'payment' | 'utilities' | 'combined';

interface DocMeta {
  type: DocType;
  label: string;
  icon: React.ReactNode;
  accentCls: string;
}

function getDocMeta(record: PaymentRecord): DocMeta {
  const hasRent = record.actualRent > 0;
  const hasBill = (record.plannedUtilities ?? 0) > 0;
  const hasPaid = record.actualUtilities > 0;

  if (hasRent && (hasBill || hasPaid)) return { type: 'combined',   label: 'Аренда + Коммунальные', icon: <Banknote size={13} />, accentCls: 'text-[#967BB6]' };
  if (hasBill && hasPaid)             return { type: 'utilities',   label: 'Коммунальные',           icon: <Zap size={13} />,     accentCls: 'text-amber-500' };
  if (hasBill && !hasPaid)            return { type: 'bill',        label: 'Счёт ЖКХ',              icon: <FileText size={13} />, accentCls: 'text-blue-500'  };
  if (!hasBill && hasPaid)            return { type: 'payment',     label: 'Оплата ЖКХ',            icon: <Zap size={13} />,     accentCls: 'text-emerald-500' };
  return                                     { type: 'rent',        label: 'Аренда',                icon: <Banknote size={13} />, accentCls: 'text-[#967BB6]' };
}

function getDocStatus(record: PaymentRecord, meta: DocMeta): PeriodStatus | 'pending' {
  if (meta.type === 'bill') return 'pending';
  if (meta.type === 'rent' || meta.type === 'combined') {
    if (record.actualRent === 0) return 'unpaid';
    if (record.actualRent < record.plannedRent) return 'partial';
    return 'paid';
  }
  if (meta.type === 'payment') return 'paid';
  // utilities
  if (record.actualUtilities === 0) return 'unpaid';
  if (record.actualUtilities < (record.plannedUtilities ?? 0)) return 'partial';
  return 'paid';
}

// ── MonthGroup ────────────────────────────────────────────────────────────────

function MonthGroup({
  period,
  records,
  isParking,
  onSave,
  onDelete,
}: {
  period: string;
  records: PaymentRecord[];
  isParking: boolean;
  onSave: (recordId: string, updates: Partial<PaymentRecord>) => void;
  onDelete: (recordId: string) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalActualRent = records.reduce((s, r) => s + r.actualRent, 0);
  const plannedRent = records.find(r => r.plannedRent > 0)?.plannedRent ?? 0;
  const totalPlannedUtils = isParking ? 0 : Math.max(0, ...records.map(r => r.plannedUtilities ?? 0));
  const totalActualUtils = isParking ? 0 : records.reduce((s, r) => s + r.actualUtilities, 0);
  const totalPlanned = plannedRent + totalPlannedUtils;
  const totalActual = totalActualRent + totalActualUtils;
  const status = getPeriodStatus(records, isParking);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Period header — collapsed summary */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 capitalize">{formatPeriod(period)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatCurrency(totalActual)} из {formatCurrency(totalPlanned)}
          </p>
        </div>
        <StatusChip status={status} />
        {expanded
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>

      {/* Expanded: totals banner + document list */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Totals summary */}
          {(() => {
            const diff = totalActual - totalPlanned;
            return (
              <div className={`px-4 py-3 bg-slate-50/80 border-b border-slate-100 grid gap-4 text-xs ${isParking ? 'grid-cols-3' : 'grid-cols-4'}`}>
                <div>
                  <p className="text-slate-400 mb-0.5">Аренда</p>
                  <p className="font-bold text-slate-800">{formatCurrency(totalActualRent)}</p>
                  <p className="text-slate-400">план {formatCurrency(plannedRent)}</p>
                </div>
                {!isParking && (
                  <div>
                    <p className="text-slate-400 mb-0.5">Коммунальные</p>
                    <p className="font-bold text-slate-800">{formatCurrency(totalActualUtils)}</p>
                    <p className="text-slate-400">счёт {formatCurrency(totalPlannedUtils)}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-400 mb-0.5">Итого</p>
                  <p className="font-bold text-slate-800">{formatCurrency(totalActual)}</p>
                  <p className="text-slate-400">из {formatCurrency(totalPlanned)}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">{diff >= 0 ? 'Переплата' : 'Недоплата'}</p>
                  <p className={`font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Document list */}
          <div className="divide-y divide-slate-100">
            {records.map(record => (
              <DocumentCard
                key={record.id}
                record={record}
                isParking={isParking}
                onSave={(updates) => onSave(record.id, updates)}
                onDelete={() => onDelete(record.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DocumentCard ─────────────────────────────────────────────────────────────

function DocumentCard({
  record,
  isParking,
  onSave,
  onDelete,
}: {
  record: PaymentRecord;
  isParking: boolean;
  onSave: (updates: Partial<PaymentRecord>) => void;
  onDelete: () => Promise<boolean>;
}) {
  const meta = getDocMeta(record);
  const docStatus = getDocStatus(record, meta);
  const [editing, setEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [period, setPeriod] = useState(record.period);
  const [plannedRent, setPlannedRent] = useState(record.plannedRent);
  const [actualRent, setActualRent] = useState(record.actualRent);
  const [rentPaymentDate, setRentPaymentDate] = useState(record.rentPaymentDate);
  const [rentPaymentType, setRentPaymentType] = useState<'cash' | 'card'>(record.rentPaymentType);
  const [plannedUtils, setPlannedUtils] = useState(record.plannedUtilities ?? 0);
  const [actualUtils, setActualUtils] = useState(record.actualUtilities);
  const [utilitiesPaymentDate, setUtilitiesPaymentDate] = useState(record.utilitiesPaymentDate);
  const [utilitiesPaymentType, setUtilitiesPaymentType] = useState<'cash' | 'card'>(record.utilitiesPaymentType);
  const [note, setNote] = useState(record.note ?? '');

  const handleCancel = () => {
    setPeriod(record.period);
    setPlannedRent(record.plannedRent);
    setActualRent(record.actualRent);
    setRentPaymentDate(record.rentPaymentDate);
    setRentPaymentType(record.rentPaymentType);
    setPlannedUtils(record.plannedUtilities ?? 0);
    setActualUtils(record.actualUtilities);
    setUtilitiesPaymentDate(record.utilitiesPaymentDate);
    setUtilitiesPaymentType(record.utilitiesPaymentType);
    setNote(record.note ?? '');
    setEditing(false);
  };

  const handleSave = () => {
    const today = new Date().toISOString().split('T')[0];
    if (rentPaymentDate && rentPaymentDate > today) {
      window.alert('Дата оплаты аренды не может быть в будущем');
      return;
    }
    if (utilitiesPaymentDate && utilitiesPaymentDate > today) {
      window.alert('Дата оплаты коммунальных не может быть в будущем');
      return;
    }
    onSave({
      period,
      plannedRent,
      actualRent,
      rentPaymentDate,
      rentPaymentType,
      plannedUtilities: isParking ? 0 : plannedUtils,
      actualUtilities: isParking ? 0 : actualUtils,
      utilitiesPaymentDate: isParking ? '' : utilitiesPaymentDate,
      utilitiesPaymentType,
      note,
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Удалить эту запись? Действие нельзя отменить.');
    if (!confirmed) return;
    setIsDeleting(true);
    const deleted = await onDelete();
    setIsDeleting(false);
    if (!deleted) window.alert('Не удалось удалить запись. Попробуйте ещё раз.');
  };

  const showRentFields = meta.type === 'rent' || meta.type === 'combined';
  const showBillField   = (meta.type === 'bill' || meta.type === 'utilities' || meta.type === 'combined') && !isParking;
  const showPaidFields  = (meta.type === 'payment' || meta.type === 'utilities' || meta.type === 'combined') && !isParking;

  return (
    <div className="px-4 py-3 text-xs">
      {!editing ? (
        /* ── view row ── */
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 flex-shrink-0 ${meta.accentCls}`}>{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-slate-700">{meta.label}</span>
              <StatusChip status={docStatus} small />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500">
              {showRentFields && (
                <>
                  <span>план <b className="text-slate-700">{formatCurrency(record.plannedRent)}</b></span>
                  <span>факт <b className="text-slate-700">{formatCurrency(record.actualRent)}</b></span>
                  {record.rentPaymentDate && <span>{formatDate(record.rentPaymentDate)}</span>}
                  <span>{record.rentPaymentType === 'cash' ? '💵 нал' : '💳 карта'}</span>
                </>
              )}
              {showBillField && (
                <span>счёт <b className="text-slate-700">{formatCurrency(record.plannedUtilities ?? 0)}</b></span>
              )}
              {showPaidFields && (
                <>
                  <span>оплачено <b className="text-slate-700">{formatCurrency(record.actualUtilities)}</b></span>
                  {record.utilitiesPaymentDate && <span>{formatDate(record.utilitiesPaymentDate)}</span>}
                  <span>{record.utilitiesPaymentType === 'cash' ? '💵 нал' : '💳 карта'}</span>
                </>
              )}
            </div>
            {record.note && <p className="text-slate-400 mt-1 italic">{record.note}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Изменить
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2.5 py-1 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? '...' : 'Удалить'}
            </button>
          </div>
        </div>
      ) : (
        /* ── edit form ── */
        <div className="bg-slate-50 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 font-semibold ${meta.accentCls}`}>
              {meta.icon} {meta.label}
            </span>
            <Field label="">
              <input type="month" className={inputCls} value={period} onChange={e => setPeriod(e.target.value)} />
            </Field>
          </div>

          {showRentFields && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="План (аренда)">
                  <input type="number" step="0.01" min="0" className={inputCls} value={plannedRent || ''} onChange={e => setPlannedRent(Number(e.target.value))} />
                </Field>
                <Field label="Фактически">
                  <input type="number" step="0.01" min="0" className={inputCls} value={actualRent || ''} onChange={e => setActualRent(Number(e.target.value))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Дата оплаты">
                  <input type="date" className={inputCls} value={rentPaymentDate} onChange={e => setRentPaymentDate(e.target.value)} />
                </Field>
                <Field label="Способ">
                  <PaymentTypeToggle value={rentPaymentType} onChange={setRentPaymentType} />
                </Field>
              </div>
            </>
          )}

          {showBillField && (
            <Field label="Сумма по счёту">
              <input type="number" step="0.01" min="0" className={inputCls} value={plannedUtils || ''} onChange={e => setPlannedUtils(Number(e.target.value))} />
            </Field>
          )}

          {showPaidFields && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Оплачено">
                  <input type="number" step="0.01" min="0" className={inputCls} value={actualUtils || ''} onChange={e => setActualUtils(Number(e.target.value))} />
                </Field>
                <Field label="Дата оплаты">
                  <input type="date" className={inputCls} value={utilitiesPaymentDate} onChange={e => setUtilitiesPaymentDate(e.target.value)} />
                </Field>
              </div>
              <Field label="Способ">
                <PaymentTypeToggle value={utilitiesPaymentType} onChange={setUtilitiesPaymentType} />
              </Field>
            </>
          )}

          <Field label="Заметка">
            <textarea className={`${inputCls} resize-none`} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Комментарий..." />
          </Field>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-700 disabled:opacity-50">
              {isDeleting ? 'Удаление...' : 'Удалить запись'}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={handleCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">Отмена</button>
              <button type="button" onClick={handleSave} className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
