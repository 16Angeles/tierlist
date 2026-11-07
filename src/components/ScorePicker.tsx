import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Minus } from 'lucide-react'
import { TIERS, tierForScore } from '../lib/tiers'
import type { Item, Mode, PersonId } from '../types'

export function ScorePicker({
  position,
  item,
  mode,
  person,
  names,
  onPick,
  onClose,
}: {
  position: { x: number; y: number }
  item: Item
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  onPick: (score: number | undefined) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onScroll = () => onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [onClose])

  const mine = item.ratings[person]?.score
  const other = mode === 'shared' ? undefined : item.ratings[person === 'u1' ? 'u2' : 'u1']?.score

  return createPortal(
    <div
      className="fixed z-[130] w-[268px] rounded-2xl border border-white/10 bg-[#0b0d15]/97 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
        <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
          {item.title}
        </div>
        {mine ? (
          <button
            className="flex items-center gap-1 text-[11px] font-medium text-white/35 transition hover:text-rose-300"
            onClick={() => {
              onPick(undefined)
              onClose()
            }}
          >
            <Minus size={12} /> снять
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const tier = tierForScore(n)
          const active = mine === n
          return (
            <button
              key={n}
              onClick={() => {
                onPick(n)
                onClose()
              }}
              className="relative h-11 rounded-xl border text-[15px] font-semibold transition-all duration-150"
              style={{
                borderColor: active ? tier?.to : `${tier?.to}38`,
                background: active
                  ? `linear-gradient(160deg, ${tier?.from}, ${tier?.to})`
                  : `${tier?.to}14`,
                color: active ? '#0a0c14' : tier?.to,
                boxShadow: active ? `0 8px 22px -10px ${tier?.glow}` : 'none',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[.07] px-0.5 pt-2.5 text-[11px]">
        <span
          className="font-semibold uppercase tracking-wider"
          style={{ color: tierForScore(mine)?.to ?? 'rgba(255,255,255,0.35)' }}
        >
          {TIERS.find((t) => t.id === tierForScore(mine)?.id)?.caption ?? 'без оценки'}
        </span>
        {mode === 'split' && (
          <span className="text-white/45">
            {names[person === 'u1' ? 'u2' : 'u1']}: {other ?? '—'}
          </span>
        )}
      </div>
    </div>,
    document.body,
  )
}
