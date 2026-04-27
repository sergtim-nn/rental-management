import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface CardProps {
  obj: RealEstateObject;
  category?: Category;
  periodSelection: PeriodSelection;
  onOpenObject: (id: string) => void;
  onArchiveObject: (id: string) => void;
  onRestoreObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
}

function SortableCard({
  obj,
  category,
  periodSelection,
  onOpenObject,
  onArchiveObject,
  onRestoreObject,
  onDeleteObject,
}: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: obj.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    cursor: 'grab',
    touchAction: 'manipulation',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ObjectCard
        obj={obj}
        category={category}
        periodSelection={periodSelection}
        onClick={() => onOpenObject(obj.id)}
        onArchive={() => onArchiveObject(obj.id)}
        onRestore={() => onRestoreObject(obj.id)}
        onDelete={() => onDeleteObject(obj.id)}
      />
    </div>
  );
}

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
  const [sortedIds, setSortedIds] = useState<string[]>(() => objects.map((o) => o.id));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Синхронизируем при добавлении/удалении объектов
  useEffect(() => {
    setSortedIds((prev) => {
      const existing = new Set(objects.map((o) => o.id));
      const kept     = prev.filter((id) => existing.has(id));
      const added    = objects.filter((o) => !prev.includes(o.id)).map((o) => o.id);
      return [...kept, ...added];
    });
  }, [objects]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setSortedIds((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      api.reorderObjects(next).catch(() => { /* сервер временно недоступен */ });
      return next;
    });
  };

  const sortedObjects = sortedIds
    .map((id) => objects.find((o) => o.id === id))
    .filter((o): o is RealEstateObject => Boolean(o));

  const activeObj = activeId ? sortedObjects.find((o) => o.id === activeId) : null;
  const activeCategory = activeObj ? categories.find((c) => c.id === activeObj.categoryId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedObjects.map((obj) => (
            <SortableCard
              key={obj.id}
              obj={obj}
              category={categories.find((c) => c.id === obj.categoryId)}
              periodSelection={periodSelection}
              onOpenObject={onOpenObject}
              onArchiveObject={onArchiveObject}
              onRestoreObject={onRestoreObject}
              onDeleteObject={onDeleteObject}
            />
          ))}

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
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeObj ? (
          <div style={{
            cursor: 'grabbing',
            boxShadow: '0 20px 60px rgba(0,0,0,.22), 0 4px 18px rgba(150,123,182,.35)',
            borderRadius: '1rem',
            transform: 'rotate(1.5deg)',
          }}>
            <ObjectCard
              obj={activeObj}
              category={activeCategory}
              periodSelection={periodSelection}
              onClick={() => {}}
              onArchive={() => {}}
              onRestore={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
