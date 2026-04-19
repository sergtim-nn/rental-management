import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import ObjectCard from './ObjectCard';
import { api } from '../api/client';
import { RealEstateObject, Category } from '../types';
import { PeriodSelection } from '../utils/payments';

interface Props {
  objects: RealEstateObject[];
  categories: Category[];
  periodSelection: PeriodSelection;
  onOpenObject: (id: string) => void;
  onArchiveObject: (id: string) => void;
  onRestoreObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onNewObject?: () => void;
}

const LONG_PRESS_MS  = 1200;
const CANCEL_MOVE_PX = 10;

export default function SortableObjectsGrid({
  objects,
  categories,
  periodSelection,
  onOpenObject,
  onArchiveObject,
  onRestoreObject,
  onDeleteObject,
  onNewObject,
}: Props) {
  // ── Order state (initialised from server-ordered objects prop) ────────────
  const [sortedIds, setSortedIds] = useState<string[]>(() => objects.map((o) => o.id));

  // Sync when objects change (added / removed / reloaded from server)
  useEffect(() => {
    setSortedIds((prev) => {
      const existing = new Set(objects.map((o) => o.id));
      const kept     = prev.filter((id) => existing.has(id));
      const added    = objects.filter((o) => !prev.includes(o.id)).map((o) => o.id);
      return [...kept, ...added];
    });
  }, [objects]);

  const sortedObjects = sortedIds
    .map((id) => objects.find((o) => o.id === id))
    .filter((o): o is RealEstateObject => Boolean(o));

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragId, setDragId]       = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number>(-1);
  const [ghostPos, setGhostPos]   = useState({ x: 0, y: 0 });
  const [ghostRect, setGhostRect] = useState<DOMRect | null>(null);
  const [lifted, setLifted]       = useState(false);

  // Refs to avoid stale closures in global handlers
  const dragIdRef      = useRef<string | null>(null);
  const overIndexRef   = useRef<number>(-1);
  const pointerIdRef   = useRef<number | null>(null);
  const startPosRef    = useRef({ x: 0, y: 0 });
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasDraggingRef = useRef(false);
  const cardRefs       = useRef<Map<string, HTMLDivElement>>(new Map());
  const sortedIdsRef   = useRef<string[]>(sortedIds);

  useEffect(() => { dragIdRef.current    = dragId; },    [dragId]);
  useEffect(() => { overIndexRef.current = overIndex; }, [overIndex]);
  useEffect(() => { sortedIdsRef.current = sortedIds; }, [sortedIds]);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  // Find best drop-target index in the list WITHOUT the dragged card
  const getTargetIndex = useCallback((clientX: number, clientY: number, excludeId: string): number => {
    const ids = sortedIdsRef.current;
    const items = ids
      .filter((id) => id !== excludeId)
      .map((id) => {
        const el = cardRefs.current.get(id);
        return el ? { rect: el.getBoundingClientRect() } : null;
      })
      .filter((x): x is { rect: DOMRect } => x !== null);

    if (items.length === 0) return 0;

    let bestDist = Infinity;
    let bestIdx  = 0;
    items.forEach(({ rect }, i) => {
      const cx   = rect.left + rect.width / 2;
      const cy   = rect.top  + rect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist < bestDist) { bestDist = dist; bestIdx = clientX >= cx ? i + 1 : i; }
    });
    return Math.max(0, Math.min(bestIdx, items.length));
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent, obj: RealEstateObject) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    startPosRef.current  = { x: e.clientX, y: e.clientY };
    pointerIdRef.current = e.pointerId;
    wasDraggingRef.current = false;

    const el = cardRefs.current.get(obj.id);
    if (!el) return;

    timerRef.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setDragId(obj.id);
      setGhostRect(rect);
      setGhostPos({ x: startPosRef.current.x, y: startPosRef.current.y });
      setLifted(false);
      wasDraggingRef.current = true;
      try { el.setPointerCapture(pointerIdRef.current!); } catch { /* */ }
      requestAnimationFrame(() => setLifted(true));
      if (navigator.vibrate) navigator.vibrate(50);
    }, LONG_PRESS_MS);
  }, []);

  const handleGlobalMove = useCallback((e: PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    if (!dragIdRef.current) {
      if (Math.hypot(dx, dy) > CANCEL_MOVE_PX) cancelTimer();
      return;
    }

    e.preventDefault();
    setGhostPos({ x: e.clientX, y: e.clientY });
    const idx = getTargetIndex(e.clientX, e.clientY, dragIdRef.current);
    setOverIndex(idx);
  }, [cancelTimer, getTargetIndex]);

  const handleGlobalUp = useCallback((_e: PointerEvent) => {
    cancelTimer();
    const id = dragIdRef.current;
    if (!id) return;

    const targetIdx = overIndexRef.current;
    setDragId(null);
    setLifted(false);
    setOverIndex(-1);
    if (targetIdx < 0) return;

    setSortedIds((prev) => {
      const without = prev.filter((x) => x !== id);
      without.splice(targetIdx, 0, id);
      // Сохраняем на сервере (fire-and-forget с тихой обработкой ошибки)
      api.reorderObjects(without).catch(() => {/* сервер временно недоступен */});
      return without;
    });
  }, [cancelTimer]);

  // Global listeners only while dragging
  useEffect(() => {
    if (!dragId) return;
    window.addEventListener('pointermove',   handleGlobalMove, { passive: false });
    window.addEventListener('pointerup',     handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove',   handleGlobalMove);
      window.removeEventListener('pointerup',     handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, [dragId, handleGlobalMove, handleGlobalUp]);

  // ── Build display list with placeholder ───────────────────────────────────
  const displayList: Array<RealEstateObject | null> = [...sortedObjects];
  let draggingObj: RealEstateObject | null = null;

  if (dragId && overIndex >= 0) {
    const from = displayList.findIndex((o) => o?.id === dragId);
    if (from !== -1) {
      draggingObj = displayList[from] as RealEstateObject;
      displayList.splice(from, 1);
      displayList.splice(Math.min(overIndex, displayList.length), 0, null);
    }
  }

  const ghostDx = ghostPos.x - startPosRef.current.x;
  const ghostDy = ghostPos.y - startPosRef.current.y;

  return (
    <div style={{ position: 'relative' }}>
      {/* Overlay blocks interaction on other elements during drag */}
      {dragId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 998, touchAction: 'none' }}
          onPointerUp={(e) => handleGlobalUp(e.nativeEvent)}
        />
      )}

      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        style={{ userSelect: 'none' }}
      >
        {displayList.map((obj) => {
          if (!obj) {
            return (
              <div
                key="__placeholder__"
                className="rounded-2xl border-2 border-dashed border-[#967BB6] bg-[#f0ebf8]/60 transition-all duration-150"
                style={{ minHeight: ghostRect ? ghostRect.height : 160 }}
              />
            );
          }

          const isDragging = obj.id === dragId;
          const category   = categories.find((c) => c.id === obj.categoryId);

          return (
            <div
              key={obj.id}
              ref={(el) => { if (el) cardRefs.current.set(obj.id, el); else cardRefs.current.delete(obj.id); }}
              onPointerDown={(e) => handlePointerDown(e, obj)}
              onPointerUp={cancelTimer}
              onPointerCancel={cancelTimer}
              onClickCapture={(e) => { if (wasDraggingRef.current) e.stopPropagation(); }}
              className={`transition-all duration-150 ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={{ touchAction: dragId ? 'none' : 'pan-y', cursor: 'grab' }}
            >
              <ObjectCard
                obj={obj}
                category={category}
                onClick={() => { if (!wasDraggingRef.current) onOpenObject(obj.id); }}
                onArchive={() => onArchiveObject(obj.id)}
                onRestore={() => onRestoreObject(obj.id)}
                onDelete={() => onDeleteObject(obj.id)}
              />
            </div>
          );
        })}

        {onNewObject && (
          <button
            onClick={onNewObject}
            className="border-2 border-dashed border-[#d8d0e8] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-[#967BB6] hover:border-[#967BB6] hover:bg-[#f0ebf8] transition-all min-h-[160px]"
          >
            <Plus size={22} />
            <span className="text-xs font-medium">Добавить объект</span>
          </button>
        )}
      </div>

      {/* Floating ghost card */}
      {dragId && ghostRect && draggingObj && (() => {
        const obj      = draggingObj!;
        const category = categories.find((c) => c.id === obj.categoryId);
        return (
          <div
            style={{
              position: 'fixed',
              left: ghostRect.left,
              top:  ghostRect.top,
              width:  ghostRect.width,
              height: ghostRect.height,
              transform: `translate(${ghostDx}px,${ghostDy}px) scale(${lifted ? 1.05 : 1}) rotate(${lifted ? 1.5 : 0}deg)`,
              transition: lifted ? 'box-shadow .2s, transform .2s' : 'none',
              boxShadow: lifted ? '0 20px 60px rgba(0,0,0,.22), 0 4px 18px rgba(150,123,182,.35)' : 'none',
              zIndex: 999,
              pointerEvents: 'none',
              borderRadius: '1rem',
              willChange: 'transform',
            }}
          >
            <ObjectCard
              obj={obj}
              category={category}
              onClick={() => {}}
              onArchive={() => {}}
              onRestore={() => {}}
              onDelete={() => {}}
            />
          </div>
        );
      })()}
    </div>
  );
}
