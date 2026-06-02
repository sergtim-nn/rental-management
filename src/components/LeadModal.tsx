import { useState } from 'react';
import { X, Save, User, Mail, MessageSquare, Tag, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { RealEstateObject, LeadStatus, LeadQuestion } from '../types';
import { Field, inputCls } from './object-modal/shared';
import { LEAD_STATUSES, getLeadStatusMeta, PHONE_BOOTH_CATEGORY_ID } from '../utils/leads';
import { ChevronDown } from 'lucide-react';
import AutoTextarea from './AutoTextarea';
import { generateId } from '../store/storage';

interface LeadModalProps {
  obj: RealEstateObject | null;
  isNew: boolean;
  onSave: (data: Partial<RealEstateObject>) => void;
  onClose: () => void;
}

export default function LeadModal({
  obj,
  isNew,
  onSave,
  onClose,
}: LeadModalProps) {
  const categoryId = obj?.categoryId ?? PHONE_BOOTH_CATEGORY_ID;
  const [fullName, setFullName]         = useState(obj?.leadFullName ?? '');
  const [phoneDigits, setPhoneDigits]   = useState(() => {
    const p = obj?.tenantPhone ?? '';
    const digits = p.replace(/\D/g, '');
    if ((digits.startsWith('7') || digits.startsWith('8')) && digits.length === 11) return digits.slice(1);
    return digits.slice(0, 10);
  });
  const [maxDigits, setMaxDigits]       = useState(() => {
    const m = obj?.leadMaxPhone ?? '';
    const digits = m.replace(/\D/g, '');
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
  const [email, setEmail]       = useState(obj?.leadEmail ?? '');
  const [comment, setComment]   = useState(obj?.leadComment ?? '');
  const [status, setStatus]     = useState<LeadStatus>((obj?.leadStatus ?? '') as LeadStatus);
  const [action, setAction]     = useState(obj?.leadAction ?? '');
  const [questions, setQuestions] = useState<LeadQuestion[]>(obj?.leadQuestions ?? []);

  const addQuestion = () => {
    setQuestions((qs) => [...qs, { id: generateId(), text: '', resolved: false }]);
  };
  const updateQuestion = (id: string, patch: Partial<LeadQuestion>) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };
  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  };

  const statusMeta = getLeadStatusMeta(status);
  const showAction = statusMeta.requiresAction;

  const handleSave = () => {
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      window.alert('Некорректный e-mail');
      return;
    }
    const data: Partial<RealEstateObject> = {
      categoryId,
      // Поля недвижимости: для лида не используются, но требуются схемой объекта
      street:        '',
      building:      '',
      contractDate:  '',
      plannedRent:   0,
      tenantName:    '',
      tenantPhone:   phoneDigits ? `+7${phoneDigits}` : '',
      tenantTelegram: telegramMode === 'phone'
        ? (telegramValue ? `+7${telegramValue}` : '')
        : (telegramValue ? `@${telegramValue}` : ''),
      leadFullName:  fullName,
      leadMaxPhone:  maxDigits ? `+7${maxDigits}` : '',
      leadEmail:     email,
      leadComment:   comment,
      leadStatus:    status,
      leadAction:    showAction ? action : '',
      leadQuestions: questions
        .map((q) => ({ ...q, text: q.text.trim() }))
        .filter((q) => q.text.length > 0 || q.resolved),
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-[#faf9f6] rounded-2xl shadow-2xl w-full max-w-xl max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white rounded-t-2xl border-b border-[#ede9f4]">
          <h2 className="font-bold text-slate-800 text-lg">
            {isNew ? 'Новый лид' : (fullName || 'Лид')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#f0ebf8] rounded-xl text-slate-400 hover:text-[#967BB6] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Contact section */}
          <div className="bg-white rounded-xl p-4 border border-[#ede9f4] space-y-3">
            <p className="text-xs font-semibold text-[#967BB6] uppercase tracking-wider flex items-center gap-1">
              <User size={12} /> Контакт
            </p>
            <Field label="ФИО">
              <input
                className={inputCls}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Телефон">
                <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent overflow-hidden">
                  <span className="px-3 py-2.5 text-sm font-medium text-slate-500 bg-[#faf9f6] border-r border-[#ede9f4] select-none whitespace-nowrap">+7</span>
                  <input
                    className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="999 000 00 00"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
              </Field>

              <Field label="MAX (мессенджер)">
                <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent overflow-hidden">
                  <span className="px-3 py-2.5 text-sm font-medium text-slate-500 bg-[#faf9f6] border-r border-[#ede9f4] select-none whitespace-nowrap">+7</span>
                  <input
                    className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
                    value={maxDigits}
                    onChange={(e) => setMaxDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="999 000 00 00"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
              </Field>

              <Field label="Telegram">
                <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setTelegramMode(telegramMode === 'phone' ? 'login' : 'phone'); setTelegramValue(''); }}
                    title="Переключить тип"
                    className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-[#967BB6] bg-[#faf9f6] border-r border-[#ede9f4] hover:bg-[#f0ebf8] whitespace-nowrap select-none"
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

              <Field label="Эл. почта">
                <div className="flex items-center border border-[#ede9f4] rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#967BB6] focus-within:border-transparent overflow-hidden">
                  <span className="px-3 py-2.5 text-slate-400 bg-[#faf9f6] border-r border-[#ede9f4] select-none">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    className="flex-1 px-3 py-2.5 text-sm text-slate-800 focus:outline-none bg-white min-w-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Interest / Comment */}
          <div className="bg-white rounded-xl p-4 border border-[#ede9f4] space-y-3">
            <p className="text-xs font-semibold text-[#967BB6] uppercase tracking-wider flex items-center gap-1">
              <MessageSquare size={12} /> Интерес / Комментарии
            </p>
            <Field label="">
              <AutoTextarea
                className={inputCls}
                minRows={1}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Чем интересуется, какой объект ищет, заметки..."
              />
            </Field>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-xl p-4 border border-[#ede9f4] space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#967BB6] uppercase tracking-wider flex items-center gap-1">
                <HelpCircle size={12} /> Вопросы
                {questions.length > 0 && (
                  <span className="ml-1 text-slate-400 normal-case font-normal">
                    ({questions.filter((q) => q.resolved).length} / {questions.length})
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#967BB6] hover:text-[#6d548c] hover:bg-[#f0ebf8] rounded-lg px-2 py-1"
              >
                <Plus size={14} /> Вопрос
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Нет открытых вопросов</p>
            ) : (
              <ul className="space-y-2">
                {questions.map((q) => (
                  <li key={q.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={q.resolved}
                      onChange={(e) => updateQuestion(q.id, { resolved: e.target.checked })}
                      className="mt-2 h-4 w-4 accent-[#967BB6] cursor-pointer flex-shrink-0"
                      title={q.resolved ? 'Снять отметку решён' : 'Отметить решённым'}
                    />
                    <AutoTextarea
                      className={`${inputCls} ${q.resolved ? 'line-through text-slate-400' : ''}`}
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      placeholder="Что нужно выяснить..."
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="mt-1.5 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                      title="Удалить вопрос"
                      aria-label="Удалить вопрос"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Status + Action */}
          <div className="bg-white rounded-xl p-4 border border-[#ede9f4] space-y-3">
            <p className="text-xs font-semibold text-[#967BB6] uppercase tracking-wider flex items-center gap-1">
              <Tag size={12} /> Статус
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LEAD_STATUSES.filter((s) => s.value !== '').map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    status === s.value
                      ? `${s.chipClass} border-current`
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStatus('')}
                className={`px-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  status === ''
                    ? 'bg-slate-200 text-slate-600 border-slate-300'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Сбросить
              </button>
            </div>

            {showAction && (
              <Field label="Действие">
                <AutoTextarea
                  className={inputCls}
                  minRows={2}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="Что планируем сделать (показ, отправить договор, перезвонить...)"
                />
              </Field>
            )}
          </div>
        </div>

        {/* Footer */}
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
            {isNew ? 'Создать лид' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
