import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import type { Item, Mode, PersonId } from '../types'
import { TIERS, tierForItem } from '../lib/tiers'
import { TierRow } from './TierRow'

export function TierBoard({
  items,
  mode,
  person,
  names,
  onScore,
  onOpen,
  listName,
  onExportPng,
  onShare,
  exporting,
  draggingItem,
}: {
  items: Item[]
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  onScore: (itemId: string, score: number | undefined) => void
  onOpen: (item: Item) => void
  listName: string
  onExportPng: () => void
  onShare: () => void
  exporting: boolean
  draggingItem?: Item | null
}) {
  const groups = useMemo(() => {
    const map: Record<string, Item[]> = { S: [], A: [], B: [], C: [], D: [] }
    for (const it of items) {
      const t = tierForItem(it, mode)
      if (t) map[t.id].push(it)
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.order - b.order)
    return map
  }, [items, mode])

  const rated = items.filter((i) => tierForItem(i, mode)).length

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="font-display text-[34px] leading-none tracking-wide text-white sm:text-[42px]">
            {listName || 'Тирлист'}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-white/40">
            {rated} из {items.length} оценено · шкала от 1 до 10
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            data-no-export
            className="hidden items-center gap-1.5 text-[11px] text-white/35 sm:flex"
          >
            <Sparkles size={13} className="text-amber-400/70" />
            <span>перетащите карточку в нужный тир</span>
          </span>
          <button
            data-no-export
            className="btn btn-ghost !px-2.5 !py-1.5 !text-[11px]"
            onClick={onShare}
          >
            Поделиться
          </button>
          <button
            data-no-export
            className="btn btn-ghost !px-2.5 !py-1.5 !text-[11px]"
            onClick={onExportPng}
            disabled={exporting}
          >
            {exporting ? 'Рендер…' : 'PNG'}
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {TIERS.map((tier) => (
          <TierRow
            key={tier.id}
            tier={tier}
            items={groups[tier.id]}
            mode={mode}
            person={person}
            names={names}
            onScore={onScore}
            onOpen={onOpen}
            total={items.length}
            draggingItem={draggingItem}
          />
        ))}
      </div>
    </section>
  )
}
