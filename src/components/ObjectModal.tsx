import { useState, useRef } from 'react';
import { RealEstateObject, Category, Document, PaymentRecord } from '../types';
import { formatCurrency, formatDate, formatPeriod } from '../utils/notifications';
import { emptyCurrentPayment } from '../store/storage';
import { api } from '../api/client';
import {
  X,
  Save,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  Upload,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  History,
  CreditCard,
  Banknote,
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
  const [plannedUtilities, setPlannedUtilities] = useState(cp.plannedUtilities ?? 0);

  // Current payment
  const cp = obj?.currentPayment ?? emptyCurrentPayment();
  const today = new Date().toISOString().split('T')[0];
  const [actualRent, setActualRent] = useState(cp.actualRent);
  const [rentPaymentDate, setRentPaymentDate] = useState(cp.rentPaymentDate || today);
  const [rentPaymentType, setRentPaymentType] = useState<'cash' | 'card'>(cp.rentPaymentType);
  const [actualUtilities, setActualUtilities] = useState(cp.actualUtilities);
  const [utilitiesPaymentDate, setUtilitiesPaymentDate] = useState(cp.utilitiesPaymentDate || today);
  const [utilitiesPaymentType, setUtilitiesPaymentType] = useState<'cash' | 'card'>(cp.utilitiesPaymentType);
  const [note, setNote] = useState(cp.note ?? '');

  // Period for history save
  const now = new Date();
  const [historyYear, setHistoryYear] = useState(now.getFullYear());
  const [historyMonth, setHistoryMonth] = useState(now.getMonth()); // 0-indexed

  // UI sections
  const [showAddress, setShowAddress] = useState(true);
  const [showTenant, setShowTenant] = useState(true);
  const [showContract, setShowContract] = useState(true);
  const [showPayment, setShowPayment] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [savedPaymentMessage, setSavedPaymentMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
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
    const period = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}`;
    onSaveToHistory(period, {
      plannedRent,
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
    }
    setTimeout(() => setSavedPaymentMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => onAddDocument(file));
    e.target.value = '';
  };

  const handleDownload = async (doc: Document) => {
    const url = doc.url;
    if (!url) return;
    try {
      const blob = await api.downloadDocument(url);
      const objectUrl = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = objectUrl;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const totalPlanned = plannedRent;
  const totalActual = isParking ? actualRent : actualRent + actualUtilities;
  const diff = totalActual - totalPlanned;
  const canSaveRentPayment = actualRent > 0;
  const canSaveUtilitiesPayment = actualUtilities > 0;

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
                <input type="date" className={inputCls} value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
              </Field>
              <Field label="Плановая аренда (₽)">
                <input type="number" className={inputCls} value={plannedRent || ''} onChange={(e) => setPlannedRent(Number(e.target.value))} placeholder="0" />
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
                    <input type="number" className={inputCls} value={actualRent || ''} onChange={(e) => setActualRent(Number(e.target.value))} placeholder="0" />
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
                          value={historyMonth}
                          onChange={(e) => setHistoryMonth(Number(e.target.value))}
                          className={inputCls}
                        >
                          {MONTHS_RU.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Год">
                        <select
                          value={historyYear}
                          onChange={(e) => setHistoryYear(Number(e.target.value))}
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
                      <input type="number" className={inputCls} value={plannedUtilities || ''} onChange={(e) => setPlannedUtilities(Number(e.target.value))} placeholder="0" />
                    </Field>
                    <Field label="Фактически оплачено (₽)">
                      <input type="number" className={inputCls} value={actualUtilities || ''} onChange={(e) => setActualUtilities(Number(e.target.value))} placeholder="0" />
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
                            value={historyMonth}
                            onChange={(e) => setHistoryMonth(Number(e.target.value))}
                            className={inputCls}
                          >
                            {MONTHS_RU.map((m, i) => (
                              <option key={i} value={i}>{m}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Год">
                          <select
                            value={historyYear}
                            onChange={(e) => setHistoryYear(Number(e.target.value))}
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
                    obj?.paymentHistory.map((record) => (
                      <HistoryRecord
                        key={record.id}
                        record={record}
                        isParking={isParking}
                        onSave={(updates) => {
                          if (!obj) return;
                          onUpdateHistoryRecord(obj.id, record.id, updates);
                        }}
                        onDelete={async () => {
                          if (!obj) return false;
                          return onDeleteHistoryRecord(obj.id, record.id);
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
                <div className="pt-2 pb-3 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#d8d0e8] rounded-xl text-sm text-[#967BB6] hover:bg-[#f0ebf8] hover:border-[#967BB6] transition-colors"
                  >
                    <Upload size={16} />
                    Прикрепить документы
                  </button>
                  {obj?.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200">
                      <FileText size={16} className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-400">{(doc.size / 1024).toFixed(1)} KB · {formatDate(doc.uploadedAt)}</p>
                      </div>
                      <button onClick={() => handleDownload(doc)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500">
                        <Download size={14} />
                      </button>
                      <button onClick={() => onRemoveDocument(doc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
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

function HistoryRecord({
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
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [period, setPeriod] = useState(record.period);
  const [date, setDate] = useState(record.date);
  const [plannedRent, setPlannedRent] = useState(record.plannedRent);
  const [actualRent, setActualRent] = useState(record.actualRent);
  const [rentPaymentDate, setRentPaymentDate] = useState(record.rentPaymentDate);
  const [rentPaymentType, setRentPaymentType] = useState<'cash' | 'card'>(record.rentPaymentType);
  const [plannedUtilities, setPlannedUtilities] = useState(record.plannedUtilities);
  const [actualUtilities, setActualUtilities] = useState(record.actualUtilities);
  const [utilitiesPaymentDate, setUtilitiesPaymentDate] = useState(record.utilitiesPaymentDate);
  const [utilitiesPaymentType, setUtilitiesPaymentType] = useState<'cash' | 'card'>(record.utilitiesPaymentType);
  const [note, setNote] = useState(record.note ?? '');
  const totalActual = record.actualRent + record.actualUtilities;
  const diff = totalActual - record.plannedRent;

  const handleCancel = () => {
    setPeriod(record.period);
    setDate(record.date);
    setPlannedRent(record.plannedRent);
    setActualRent(record.actualRent);
    setRentPaymentDate(record.rentPaymentDate);
    setRentPaymentType(record.rentPaymentType);
    setPlannedUtilities(record.plannedUtilities);
    setActualUtilities(record.actualUtilities);
    setUtilitiesPaymentDate(record.utilitiesPaymentDate);
    setUtilitiesPaymentType(record.utilitiesPaymentType);
    setNote(record.note ?? '');
    setIsEditing(false);
  };

  const handleSave = () => {
    onSave({
      period,
      date,
      plannedRent,
      actualRent,
      rentPaymentDate,
      rentPaymentType,
      plannedUtilities: isParking ? 0 : plannedUtilities,
      actualUtilities: isParking ? 0 : actualUtilities,
      utilitiesPaymentDate: isParking ? '' : utilitiesPaymentDate,
      utilitiesPaymentType,
      note,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Удалить оплату за ${formatPeriod(record.period)}? Это действие нельзя отменить.`);
    if (!confirmed) return;
    setIsDeleting(true);
    const deleted = await onDelete();
    setIsDeleting(false);
    if (!deleted) {
      window.alert('Не удалось удалить оплату. Попробуйте ещё раз.');
      return;
    }
    setOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700">{formatPeriod(record.period)}</p>
          <p className="text-xs text-slate-400">{formatDate(record.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">{formatCurrency(totalActual)}</p>
          <p className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
          </p>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4 text-xs">
          <div className="flex items-center justify-between pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isEditing ? 'Редактирование записи' : 'Детали периода'}
            </p>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Период">
                  <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
                </Field>
                <Field label="Дата записи">
                  <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-600">Аренда</p>
                  <Field label="План">
                    <input type="number" className={inputCls} value={plannedRent || ''} onChange={(e) => setPlannedRent(Number(e.target.value))} />
                  </Field>
                  <Field label="Факт">
                    <input type="number" className={inputCls} value={actualRent || ''} onChange={(e) => setActualRent(Number(e.target.value))} />
                  </Field>
                  <Field label="Дата оплаты">
                    <input type="date" className={inputCls} value={rentPaymentDate} onChange={(e) => setRentPaymentDate(e.target.value)} />
                  </Field>
                  <Field label="Способ оплаты">
                    <PaymentTypeToggle value={rentPaymentType} onChange={setRentPaymentType} />
                  </Field>
                </div>

                {!isParking && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-600">Коммунальные</p>
                    <Field label="Сумма по счёту">
                      <input type="number" className={inputCls} value={plannedUtilities || ''} onChange={(e) => setPlannedUtilities(Number(e.target.value))} />
                    </Field>
                    <Field label="Фактически оплачено">
                      <input type="number" className={inputCls} value={actualUtilities || ''} onChange={(e) => setActualUtilities(Number(e.target.value))} />
                    </Field>
                    <Field label="Дата оплаты">
                      <input type="date" className={inputCls} value={utilitiesPaymentDate} onChange={(e) => setUtilitiesPaymentDate(e.target.value)} />
                    </Field>
                    <Field label="Способ оплаты">
                      <PaymentTypeToggle value={utilitiesPaymentType} onChange={setUtilitiesPaymentType} />
                    </Field>
                  </div>
                )}
              </div>

              <Field label="Заметка">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Комментарий к сохранённой записи"
                />
              </Field>
            </div>
          ) : (
            <div className={`grid gap-3 ${isParking ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-500 uppercase tracking-wider">Аренда</p>
                <div className="flex justify-between"><span className="text-slate-500">План:</span><span className="font-medium">{formatCurrency(record.plannedRent)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Факт:</span><span className="font-medium">{formatCurrency(record.actualRent)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Дата:</span><span className="font-medium">{formatDate(record.rentPaymentDate)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Тип:</span><span className="font-medium">{record.rentPaymentType === 'cash' ? '💵 Нал' : '💳 Карта'}</span></div>
              </div>
              {!isParking && (
                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-500 uppercase tracking-wider">Коммунальные</p>
                  {record.plannedUtilities > 0 && <div className="flex justify-between"><span className="text-slate-500">По счёту:</span><span className="font-medium">{formatCurrency(record.plannedUtilities)}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">Оплачено:</span><span className="font-medium">{formatCurrency(record.actualUtilities)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Дата:</span><span className="font-medium">{formatDate(record.utilitiesPaymentDate)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Тип:</span><span className="font-medium">{record.utilitiesPaymentType === 'cash' ? '💵 Нал' : '💳 Карта'}</span></div>
                </div>
              )}
              {record.note && (
                <div className={`${isParking ? '' : 'col-span-2'} bg-slate-50 rounded-lg p-2`}>
                  <p className="text-slate-500">Заметка: {record.note}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
