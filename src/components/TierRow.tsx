import { AlertTriangle } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import type { Factors, Item, Mode, PersonId, Weights } from '../types'
import type { TierDef } from '../lib/tiers'
import { tierTarget } from '../lib/tiers'
import { ROW_PREFIX } from '../state/useTierDnd'
import { PosterCard } from './PosterCard'

export function TierRow({
  tier,
  items,
  mode,
  person,
  names,
  weights,
  onScore,
  onFactors,
  onOpen,
  total,
  draggingItem,
}: {
  tier: TierDef
  items: Item[]
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  weights?: Weights | null
  onScore: (itemId: string, score: number | undefined) => void
  onFactors: (itemId: string, factors: Factors | undefined) => void
  onOpen: (item: Item) => void
  total: number
  draggingItem?: Item | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ROW_PREFIX}${tier.id}` })

  const share = total > 0 ? Math.round((items.length / total) * 100) : 0

  // в раздельном режиме некоторые тиры недостижимы: среднее не может туда попасть
  const unreachable =
    isOver && draggingItem
      ? !tierTarget(tier, draggingItem, mode, person)
      : false
  // диапазон средней оценки, достижимый для перетаскиваемой карточки
  const avgRange = (() => {
    if (!draggingItem) return null
    const other =
      mode === 'shared' ? undefined : draggingItem.ratings[person === 'u1' ? 'u2' : 'u1']?.score
    if (!other) return { min: 1, max: 10 }
    return { min: (1 + other) / 2, max: (10 + other) / 2 }
  })()

  return (
    <div className="flex gap-3">
      <div
        className="relative w-[74px] shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:w-[86px]"
        style={{ background: `linear-gradient(165deg, ${tier.from}1f, ${tier.to}26)` }}
      >
        <div
          className="absolute inset-0 opacity-45"
          style={{
            background: `radial-gradient(130% 70% at 15% 0%, ${tier.from}, transparent 68%)`,
          }}
        />
        <div className="relative flex h-full flex-col items-center justify-center gap-0.5 py-4">
          <div
            className="font-display text-[38px] leading-[0.9] tracking-wide sm:text-[44px]"
            style={{
              background: `linear-gradient(175deg, ${tier.from}, ${tier.to})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: `drop-shadow(0 4px 14px ${tier.glow})`,
            }}
          >
            {tier.letter}
          </div>
          <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/45">
            {tier.caption}
          </div>
          <div className="mt-0.5 text-[9.5px] font-medium tabular-nums text-white/28">
            {tier.label}
          </div>
        </div>
        {items.length > 0 && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-white/70 backdrop-blur-sm">
            {items.length}
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        data-tier={tier.id}
        className={`min-w-0 flex-1 rounded-2xl border p-2 transition-colors ${
          unreachable
            ? 'border-amber-400/50 bg-amber-400/[.07]'
            : isOver
              ? 'border-white/25 bg-white/[.07]'
              : 'border-white/[.06] bg-white/[.022]'
        }`}
        style={{ minHeight: items.length ? undefined : 118 }}
      >
        {unreachable && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[.08] px-3 py-1.5 text-[11.5px] text-amber-200/90">
            <AlertTriangle size={13} className="shrink-0 text-amber-300" />
            В этот тир не попасть: средняя оценка будет от {avgRange?.min.toFixed(1)} до{' '}
            {avgRange?.max.toFixed(1)}
          </div>
        )}
        {items.length === 0 ? (
          <div className="flex h-[102px] items-center justify-center rounded-xl border border-dashed border-white/[.09] text-[12px] text-white/25">
            Перетащите фильмы сюда — оценки {tier.label}
          </div>
        ) : (
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex min-h-[102px] flex-wrap gap-2 sm:flex-nowrap">
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
                />
              ))}
            </div>
          </SortableContext>
        )}
        {items.length > 0 && (
          <div className="mt-1 px-1 text-[10px] font-medium tabular-nums text-white/25">
            {share}% тирлиста
          </div>
        )}
      </div>
    </div>
  )
}
