import { useState } from 'react';
import { RealEstateObject, Category, PaymentRecord } from '../types';
import { formatCurrency, formatPeriod } from '../utils/notifications';
import { emptyCurrentPayment } from '../store/storage';
import DocumentsSection from './object-modal/DocumentsSection';
import HistorySection from './object-modal/HistorySection';
import AddressSection from './object-modal/AddressSection';
import ContractSection from './object-modal/ContractSection';
import TenantSection from './object-modal/TenantSection';
import { Field, PaymentTypeToggle, inputCls } from './object-modal/shared';
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
  CheckCircle2,
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
            <AddressSection
              street={street}
              building={building}
              onStreetChange={setStreet}
              onBuildingChange={setBuilding}
            />
          )}

          {/* Tenant Section */}
          <SectionHeader
            title="Арендатор"
            icon={<User size={16} />}
            expanded={showTenant}
            onToggle={() => setShowTenant(!showTenant)}
          />
          {showTenant && (
            <TenantSection
              tenantName={tenantName}
              tenantPhoneDigits={tenantPhoneDigits}
              telegramMode={telegramMode}
              telegramValue={telegramValue}
              onTenantNameChange={setTenantName}
              onTenantPhoneDigitsChange={setTenantPhoneDigits}
              onTelegramModeChange={setTelegramMode}
              onTelegramValueChange={setTelegramValue}
            />
          )}

          {/* Contract Section */}
          <SectionHeader
            title="Условия договора"
            icon={<Calendar size={16} />}
            expanded={showContract}
            onToggle={() => setShowContract(!showContract)}
          />
          {showContract && (
            <ContractSection
              contractDate={contractDate}
              plannedRent={plannedRent}
              today={today}
              onContractDateChange={setContractDate}
              onPlannedRentChange={setPlannedRent}
            />
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
                <HistorySection
                  records={obj?.paymentHistory ?? []}
                  isParking={isParking}
                  onUpdateRecord={(recordId, updates) => {
                    if (!obj) return;
                    onUpdateHistoryRecord(obj.id, recordId, updates);
                  }}
                  onDeleteRecord={async (recordId) => {
                    if (!obj) return false;
                    return onDeleteHistoryRecord(obj.id, recordId);
                  }}
                />
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
