import { useCallback, useEffect, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil } from 'lucide-react'
import type { Item, Mode, PersonId } from '../types'
import { displayedScore, tierForItem } from '../lib/tiers'
import { formatScore } from '../lib/utils'
import { ScorePicker } from './ScorePicker'
import { closeAllPickers, onCloseAllPickers } from '../lib/pickerBus'

const PALETTES: [string, string][] = [
  ['#7c3aed', '#2563eb'],
  ['#f59e0b', '#ef4444'],
  ['#06b6d4', '#3b82f6'],
  ['#ec4899', '#8b5cf6'],
  ['#10b981', '#0ea5e9'],
  ['#f43f5e', '#f97316'],
  ['#14b8a6', '#6366f1'],
  ['#eab308', '#84cc16'],
]

function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function Fallback({ title }: { title: string }) {
  const p = PALETTES[hash(title) % PALETTES.length]
  const STOP = new Set(['в', 'из', 'к', 'на', 'с', 'от', 'для', 'по', 'и', 'а', 'о', 'у', 'за', 'the', 'a'])
  const initials = title
    .split(/\s+/)
    .filter((w) => !STOP.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(155deg, ${p[0]}, ${p[1]})` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(90% 60% at 50% 38%, rgba(255,255,255,.22), transparent 70%)` }}
      />
      <span className="relative font-display text-[46px] leading-none tracking-[0.06em] text-white/85 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        {initials}
      </span>
      <div className="absolute inset-x-0 bottom-0 flex h-1.5 gap-[3px] opacity-30">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="flex-1 rounded-full bg-black/60" />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Чистый «постер» без dnd — используется и в карточке, и в оверлее   */
/* ------------------------------------------------------------------ */
function PosterFace({
  item,
  mode,
  person,
  names,
  onOpen,
  overlay,
  onOpenPicker,
}: {
  item: Item
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  onOpen?: (item: Item) => void
  overlay?: boolean
  onOpenPicker?: (el: HTMLElement) => void
}) {
  const tier = tierForItem(item, mode)
  const score = displayedScore(item, mode)
  const myScore = item.ratings[mode === 'shared' ? 'shared' : person]?.score
  const otherScore =
    mode === 'split' ? item.ratings[person === 'u1' ? 'u2' : 'u1']?.score : undefined

  return (
    <>
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-white/[.05] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.95)] ring-1 ring-white/10 transition-all duration-200 ${
          overlay
            ? 'rotate-2 scale-[1.06] ring-white/30 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)]'
            : 'group-hover:-translate-y-1 group-hover:ring-white/25 group-hover:shadow-[0_26px_50px_-18px_rgba(0,0,0,1)]'
        }`}
      >
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <Fallback title={item.title} />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/10" />

        {score ? (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenPicker?.(e.currentTarget as HTMLElement)
            }}
            className="absolute bottom-1.5 right-1.5 flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-[13px] font-bold shadow-lg transition-transform hover:scale-110 active:scale-95"
            style={{
              background: `linear-gradient(150deg, ${tier?.from}, ${tier?.to})`,
              color: '#0a0c14',
              boxShadow: `0 6px 18px -6px ${tier?.glow}, inset 0 1px 0 rgba(255,255,255,.5)`,
            }}
          >
            {mode === 'split' && myScore !== undefined && otherScore !== undefined ? '≈' : ''}
            {formatScore(score)}
          </button>
        ) : (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenPicker?.(e.currentTarget as HTMLElement)
            }}
            className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/25 bg-black/40 text-[16px] font-bold text-white/40 opacity-0 backdrop-blur-sm transition-opacity hover:border-white/50 hover:text-white/80 group-hover:opacity-100"
          >
            +
          </button>
        )}

        {mode === 'split' && otherScore !== undefined && (
          <div
            className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow"
            style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)' }}
            title={`${names[person === 'u1' ? 'u2' : 'u1']}: ${otherScore}`}
          >
            {names[person === 'u1' ? 'u2' : 'u1'].slice(0, 1).toUpperCase()}
            {otherScore}
          </div>
        )}

        {onOpen && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpen(item)
            }}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white/70 opacity-0 backdrop-blur-sm transition-all hover:bg-black/75 hover:text-white group-hover:opacity-100"
            aria-label="Редактировать"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      <div className="mt-1.5 px-0.5">
        <div className="line-clamp-2 text-[11.5px] font-medium leading-[1.25] text-white/85">
          {item.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/32">
          {item.year && <span>{item.year}</span>}
          {mode === 'split' && myScore !== undefined && (
            <>
              <span>·</span>
              <span style={{ color: tier ? tier.to : undefined }}>моя: {myScore}</span>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export function PosterCard({
  item,
  mode,
  person,
  names,
  onScore,
  onOpen,
  compact = false,
}: {
  item: Item
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  onScore: (itemId: string, score: number | undefined) => void
  onOpen: (item: Item) => void
  compact?: boolean
}) {
  const [picker, setPicker] = useState<{ x: number; y: number } | null>(null)

  // одновременно может быть открыт только один пикер
  useEffect(() => onCloseAllPickers(() => setPicker(null)), [])

  const sortable = useSortable({ id: item.id, data: { item } })

  const openPicker = useCallback((el: HTMLElement | null) => {
    const r = el?.getBoundingClientRect()
    if (!r) return
    const w = 268
    const h = 236
    let x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12)
    let y = r.bottom + 10
    if (y + h > window.innerHeight - 12) y = Math.max(12, r.top - h - 10)
    closeAllPickers()
    setPicker({ x, y })
  }, [])

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.28 : 1,
    zIndex: sortable.isDragging ? 40 : undefined,
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      data-item={item.id}
      {...sortable.attributes}
      {...sortable.listeners}
      className={`group relative ${compact ? 'w-[104px]' : 'w-[132px]'} shrink-0 cursor-grab touch-none select-none active:cursor-grabbing`}
    >
      <PosterFace
        item={item}
        mode={mode}
        person={person}
        names={names}
        onOpen={onOpen}
        onOpenPicker={openPicker}
      />
      <div className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 text-white/0 transition-colors group-hover:text-white/25">
        <GripVertical size={12} />
      </div>
      {picker && (
        <ScorePicker
          position={picker}
          item={item}
          mode={mode}
          person={person}
          names={names}
          onPick={(s) => onScore(item.id, s)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

/** Оверлей перетаскиваемой карточки — без dnd-хука, чтобы не дублировать id */
export function PosterGhost({
  item,
  mode,
  person,
  names,
}: {
  item: Item
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
}) {
  return (
    <div className="w-[132px]">
      <PosterFace item={item} mode={mode} person={person} names={names} overlay />
    </div>
  )
}
