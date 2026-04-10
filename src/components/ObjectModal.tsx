import { useState, useRef } from 'react';
import { RealEstateObject, Category, Document, PaymentRecord } from '../types';
import { formatCurrency, formatDate, formatPeriod } from '../utils/notifications';
import { generateId, emptyCurrentPayment } from '../store/storage';
import {
  X,
  Save,
  MapPin,
  User,
  Phone,
  Send,
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
  Plus,
  CheckCircle2,
} from 'lucide-react';

interface ObjectModalProps {
  obj: RealEstateObject | null;
  categories: Category[];
  isNew: boolean;
  defaultCategoryId: string;
  onSave: (data: Partial<RealEstateObject>) => void;
  onClose: () => void;
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (docId: string) => void;
  onSaveToHistory: (period: string) => void;
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
      className="w-full flex items-center gap-2 py-3 border-b border-slate-100 text-left"
    >
      <span className="text-slate-500">{icon}</span>
      <span className="font-semibold text-slate-700 flex-1">{title}</span>
      {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
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

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white";

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
}: ObjectModalProps) {
  // Form state
  const [categoryId, setCategoryId] = useState(obj?.categoryId ?? defaultCategoryId);
  const [street, setStreet] = useState(obj?.street ?? '');
  const [building, setBuilding] = useState(obj?.building ?? '');
  const [tenantName, setTenantName] = useState(obj?.tenantName ?? '');
  const [tenantPhone, setTenantPhone] = useState(obj?.tenantPhone ?? '');
  const [tenantTelegram, setTenantTelegram] = useState(obj?.tenantTelegram ?? '');
  const [contractDate, setContractDate] = useState(obj?.contractDate ?? '');
  const [plannedRent, setPlannedRent] = useState(obj?.plannedRent ?? 0);
  const [plannedUtilities, setPlannedUtilities] = useState(obj?.plannedUtilities ?? 0);

  // Current payment
  const cp = obj?.currentPayment ?? emptyCurrentPayment();
  const [actualRent, setActualRent] = useState(cp.actualRent);
  const [rentPaymentDate, setRentPaymentDate] = useState(cp.rentPaymentDate);
  const [rentPaymentType, setRentPaymentType] = useState<'cash' | 'card'>(cp.rentPaymentType);
  const [actualUtilities, setActualUtilities] = useState(cp.actualUtilities);
  const [utilitiesPaymentDate, setUtilitiesPaymentDate] = useState(cp.utilitiesPaymentDate);
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
  const [savedPeriod, setSavedPeriod] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const data: Partial<RealEstateObject> = {
      categoryId,
      street,
      building,
      tenantName,
      tenantPhone,
      tenantTelegram,
      contractDate,
      plannedRent,
      plannedUtilities,
      currentPayment: {
        date: new Date().toISOString().split('T')[0],
        actualRent,
        rentPaymentDate,
        rentPaymentType,
        actualUtilities,
        utilitiesPaymentDate,
        utilitiesPaymentType,
        note,
      },
    };
    onSave(data);
  };

  const handleSaveToHistory = () => {
    const period = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}`;
    onSaveToHistory(period);
    setSavedPeriod(period);
    // reset current payment fields
    setActualRent(0);
    setRentPaymentDate('');
    setActualUtilities(0);
    setUtilitiesPaymentDate('');
    setNote('');
    setTimeout(() => setSavedPeriod(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const doc: Document = {
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        onAddDocument(doc);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDownload = (doc: Document) => {
    const a = window.document.createElement('a');
    a.href = doc.dataUrl;
    a.download = doc.name;
    a.click();
  };

  const totalPlanned = plannedRent + plannedUtilities;
  const totalActual = actualRent + actualUtilities;
  const diff = totalActual - totalPlanned;

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white rounded-t-2xl border-b border-slate-100">
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
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
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
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-8`} value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="+7 999 000 00 00" />
                </div>
              </Field>
              <Field label="Telegram">
                <div className="relative">
                  <Send size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-8`} value={tenantTelegram} onChange={(e) => setTenantTelegram(e.target.value)} placeholder="@username" />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 pb-3">
              <Field label="Дата заключения договора">
                <input type="date" className={inputCls} value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
              </Field>
              <Field label="Плановая аренда (₽)">
                <input type="number" className={inputCls} value={plannedRent || ''} onChange={(e) => setPlannedRent(Number(e.target.value))} placeholder="0" />
              </Field>
              <Field label="Плановые коммунальные (₽)">
                <input type="number" className={inputCls} value={plannedUtilities || ''} onChange={(e) => setPlannedUtilities(Number(e.target.value))} placeholder="0" />
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Аренда</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Плановая сумма">
                    <div className="px-3 py-2.5 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700">{formatCurrency(plannedRent)}</div>
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
              </div>

              {/* Utilities */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Коммунальные платежи</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Плановая сумма">
                    <div className="px-3 py-2.5 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700">{formatCurrency(plannedUtilities)}</div>
                  </Field>
                  <Field label="Фактическая оплата (₽)">
                    <input type="number" className={inputCls} value={actualUtilities || ''} onChange={(e) => setActualUtilities(Number(e.target.value))} placeholder="0" />
                  </Field>
                </div>
                <Field label="Дата оплаты">
                  <input type="date" className={inputCls} value={utilitiesPaymentDate} onChange={(e) => setUtilitiesPaymentDate(e.target.value)} />
                </Field>
                <Field label="Способ оплаты">
                  <PaymentTypeToggle value={utilitiesPaymentType} onChange={setUtilitiesPaymentType} />
                </Field>
              </div>

              {/* Totals */}
              <div className="bg-slate-800 rounded-xl p-4 text-white">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Итог текущего периода</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Плановый</p>
                    <p className="text-lg font-bold">{formatCurrency(totalPlanned)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Фактический</p>
                    <p className="text-lg font-bold">{formatCurrency(totalActual)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Разница</p>
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

              {/* Save to history */}
              {!isNew && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
                    <History size={13} />
                    Сохранить период в историю
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={historyMonth}
                      onChange={(e) => setHistoryMonth(Number(e.target.value))}
                      className="flex-1 border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {MONTHS_RU.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={historyYear}
                      onChange={(e) => setHistoryYear(Number(e.target.value))}
                      className="border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveToHistory}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      <Plus size={14} />
                      Сохранить
                    </button>
                  </div>
                  {savedPeriod && (
                    <div className="flex items-center gap-1.5 text-green-700 bg-green-50 rounded-lg px-3 py-2 text-xs font-medium">
                      <CheckCircle2 size={13} />
                      Период {formatPeriod(savedPeriod)} сохранён в историю
                    </div>
                  )}
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
                      <HistoryRecord key={record.id} record={record} />
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
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors"
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
        <div className="px-5 py-4 bg-white rounded-b-2xl border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <Save size={16} />
            {isNew ? 'Создать объект' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryRecord({ record }: { record: PaymentRecord }) {
  const [open, setOpen] = useState(false);
  const totalPlanned = record.plannedRent + record.plannedUtilities;
  const totalActual = record.actualRent + record.actualUtilities;
  const diff = totalActual - totalPlanned;

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
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-500 uppercase tracking-wider">Аренда</p>
            <div className="flex justify-between"><span className="text-slate-500">План:</span><span className="font-medium">{formatCurrency(record.plannedRent)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Факт:</span><span className="font-medium">{formatCurrency(record.actualRent)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Дата:</span><span className="font-medium">{formatDate(record.rentPaymentDate)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Тип:</span><span className="font-medium">{record.rentPaymentType === 'cash' ? '💵 Нал' : '💳 Карта'}</span></div>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-500 uppercase tracking-wider">Коммунальные</p>
            <div className="flex justify-between"><span className="text-slate-500">План:</span><span className="font-medium">{formatCurrency(record.plannedUtilities)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Факт:</span><span className="font-medium">{formatCurrency(record.actualUtilities)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Дата:</span><span className="font-medium">{formatDate(record.utilitiesPaymentDate)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Тип:</span><span className="font-medium">{record.utilitiesPaymentType === 'cash' ? '💵 Нал' : '💳 Карта'}</span></div>
          </div>
          {record.note && (
            <div className="col-span-2 bg-slate-50 rounded-lg p-2">
              <p className="text-slate-500">Заметка: {record.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
