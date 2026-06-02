import { useState, useRef, useEffect } from 'react';
import { Phone, Send, AtSign, Mail, MoreHorizontal, MessageCircle, Archive, RotateCcw, Trash2, Pencil, Copy, Check, HelpCircle } from 'lucide-react';
import { RealEstateObject, Category } from '../types';
import { CATEGORY_COLORS } from './ObjectCard';
import { getLeadStatusMeta } from '../utils/leads';

interface LeadCardProps {
  obj: RealEstateObject;
  category?: Category;
  onClick: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function digitsOnly(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* пользователь отказал в доступе */ });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-auto p-1 rounded text-slate-400 hover:text-[#967BB6] hover:bg-[#f0ebf8] transition-colors flex-shrink-0"
      title={copied ? 'Скопировано' : `Скопировать ${label}`}
      aria-label={`Скопировать ${label}`}
    >
      {copied
        ? <Check size={12} className="text-emerald-500" />
        : <Copy size={12} />}
    </button>
  );
}

export default function LeadCard({ obj, category, onClick, onArchive, onRestore, onDelete }: LeadCardProps) {
  const colors = CATEGORY_COLORS[category?.color ?? 'orange'] ?? CATEGORY_COLORS.orange;
  const status = getLeadStatusMeta(obj.leadStatus);
  const showAction = status.requiresAction && (obj.leadAction ?? '').trim().length > 0;

  const fullName = (obj.leadFullName ?? '').trim();
  const phone    = (obj.tenantPhone ?? '').trim();
  const max      = (obj.leadMaxPhone ?? '').trim();
  const tg       = (obj.tenantTelegram ?? '').trim();
  const email    = (obj.leadEmail ?? '').trim();
  const comment  = (obj.leadComment ?? '').trim();
  const questions = obj.leadQuestions ?? [];
  const questionsTotal    = questions.length;
  const questionsResolved = questions.filter((q) => q.resolved).length;

  const tgHref = tg
    ? (tg.startsWith('@') ? `https://t.me/${tg.slice(1)}` : (tg.startsWith('+') ? `https://t.me/${digitsOnly(tg)}` : `https://t.me/${tg}`))
    : '';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div
      className={`bg-white rounded-2xl border border-[#ede9f4] overflow-hidden flex flex-col hover:shadow-md hover:border-[#c9bedd] transition-all duration-200 cursor-pointer ${obj.isArchived ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className={`h-1.5 w-full ${colors.strip}`} />

      <div className="px-3 pt-3 pb-2 flex-1 space-y-2">
        {/* Category + status row */}
        <div className="flex items-center justify-between gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            <span className="text-[10px] leading-none">{category?.icon}</span>
            {category?.name ?? 'Лид'}
          </span>
          <span
            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.chipClass}`}
            title={status.label}
          >
            {status.label}
          </span>
        </div>

        {/* Full name */}
        <p className="text-sm font-semibold text-slate-800 leading-snug break-words">
          {fullName || <span className="text-slate-400">Без имени</span>}
        </p>

        {/* Contacts */}
        <div className="space-y-1 text-xs text-slate-600">
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={12} className="text-slate-400 flex-shrink-0" />
              <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline truncate">{phone}</a>
              <CopyButton value={phone} label="телефон" />
            </div>
          )}
          {max && (
            <div className="flex items-center gap-1.5">
              <MessageCircle size={12} className="text-slate-400 flex-shrink-0" />
              <span className="flex-shrink-0">MAX</span>
              <a
                href={`https://max.ru/${max}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:underline truncate"
              >
                {max}
              </a>
              <CopyButton value={max} label="MAX" />
            </div>
          )}
          {tg && (
            <div className="flex items-center gap-1.5">
              {tg.startsWith('@')
                ? <AtSign size={12} className="text-slate-400 flex-shrink-0" />
                : <Send size={12} className="text-slate-400 flex-shrink-0" />}
              <a href={tgHref} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline truncate">{tg}</a>
              <CopyButton value={tg} label="Telegram" />
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail size={12} className="text-slate-400 flex-shrink-0" />
              <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline truncate">{email}</a>
              <CopyButton value={email} label="e-mail" />
            </div>
          )}
        </div>

        {/* Action (only when status requires) */}
        {showAction && (
          <div className="mt-2 px-2.5 py-2 bg-[#f0ebf8] border border-[#d8d0e8] rounded-lg text-xs">
            <p className="text-[10px] uppercase tracking-wider text-[#967BB6] font-semibold mb-0.5">Действие</p>
            <p className="text-slate-700 break-words whitespace-pre-wrap">{obj.leadAction}</p>
          </div>
        )}

        {/* Questions counter */}
        {questionsTotal > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <HelpCircle size={12} className="text-[#967BB6] flex-shrink-0" />
            <span className="text-slate-600">
              Вопросы:{' '}
              <b className={questionsResolved === questionsTotal ? 'text-emerald-600' : 'text-slate-700'}>
                {questionsResolved} / {questionsTotal}
              </b>
              {questionsResolved < questionsTotal && (
                <span className="text-slate-400"> ({questionsTotal - questionsResolved} ожидает)</span>
              )}
            </span>
          </div>
        )}

        {/* Comment */}
        {comment && (
          <p className="text-xs text-slate-500 italic line-clamp-2 break-words">{comment}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-[#ede9f4] flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="inline-flex items-center gap-1 text-xs text-[#967BB6] hover:text-[#6d548c] font-semibold px-2 py-1"
        >
          <Pencil size={12} /> Открыть
        </button>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Меню"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
              {!obj.isArchived ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Archive size={12} /> В архив
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRestore(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw size={12} /> Восстановить
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
              >
                <Trash2 size={12} /> Удалить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
