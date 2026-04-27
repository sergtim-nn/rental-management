import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Banknote, Zap } from 'lucide-react';
import { PaymentRecord } from '../../types';
import { formatCurrency, formatDate, formatPeriod } from '../../utils/notifications';
import { Field, PaymentTypeToggle, inputCls } from './shared';

interface HistorySectionProps {
  records: PaymentRecord[];
  isParking: boolean;
  onUpdateRecord: (recordId: string, updates: Partial<PaymentRecord>) => void;
  onDeleteRecord: (recordId: string) => Promise<boolean>;
}

export default function HistorySection({
  records,
  isParking,
  onUpdateRecord,
  onDeleteRecord,
}: HistorySectionProps) {
  if (records.length === 0) {
    return (
      <div className="pt-2 pb-3">
        <p className="text-sm text-slate-400 text-center py-4">История пуста</p>
      </div>
    );
  }
  return (
    <div className="pt-2 pb-3 space-y-2">
      {groupByPeriod(records).map(({ period, records }) => (
        <MonthGroup
          key={period}
          period={period}
          records={records}
          isParking={isParking}
          onSave={onUpdateRecord}
          onDelete={onDeleteRecord}
        />
      ))}
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
