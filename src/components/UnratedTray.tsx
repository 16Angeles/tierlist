import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Inbox, Plus } from 'lucide-react'
import type { Factors, Item, Mode, PersonId, Weights } from '../types'
import { ROW_PREFIX } from '../state/useTierDnd'
import { PosterCard } from './PosterCard'

export function UnratedTray({
  items,
  mode,
  person,
  names,
  weights,
  onScore,
  onFactors,
  onOpen,
  onAdd,
}: {
  items: Item[]
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  weights?: Weights | null
  onScore: (itemId: string, score: number | undefined) => void
  onFactors: (itemId: string, factors: Factors | undefined) => void
  onOpen: (item: Item) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ROW_PREFIX}?` })

  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox size={15} className="text-white/45" />
          <h2 className="text-[13px] font-semibold text-white/85">Без оценки</h2>
          <span className="chip bg-white/[.07] text-white/50">{items.length}</span>
        </div>
        <button className="btn btn-ghost !px-2.5 !py-1.5 !text-[11px]" onClick={onAdd}>
          <Plus size={13} /> Добавить
        </button>
      </div>

      <div
        ref={setNodeRef}
        data-tier="?"
        className={`rounded-xl border p-2 transition-colors ${
          isOver ? 'border-white/25 bg-white/[.06]' : 'border-white/[.06] bg-white/[.015]'
        }`}
      >
        {items.length === 0 ? (
          <div className="py-6 text-center text-[11.5px] leading-relaxed text-white/25">
            Здесь появятся фильмы, которым вы ещё не поставили оценку.
            <br />
            Перетащите их в тир — оценка проставится автоматически.
          </div>
        ) : (
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <PosterCard
                  key={item.id}
                  item={item}
                  mode={mode}
                  person={person}
                  names={names}
                  weights={weights}
                  onScore={onScore}
                  onFactors={onFactors}
                  onOpen={onOpen}
                  compact
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  )
}
