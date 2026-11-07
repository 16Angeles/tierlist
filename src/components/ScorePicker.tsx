import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus } from 'lucide-react'
import {
  SCORE_MAX,
  SCORE_MIN,
  TIERS,
  snapScore,
  tierForScore,
} from '../lib/tiers'
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
  const key = mode === 'shared' ? 'shared' : person
  const mine = item.ratings[key]?.score
  const other = mode === 'split' ? item.ratings[person === 'u1' ? 'u2' : 'u1']?.score : undefined

  const [value, setValue] = useState<number>(mine ?? 7)
  const [text, setText] = useState<string>(mine ? String(mine) : '')

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

  // тир, в который попадёт карточка с учётом оценки второго участника
  const resultAvg = other ? (value + other) / 2 : value
  const tier = tierForScore(resultAvg)
  const myTier = tierForScore(value)

  const commit = (v: number) => {
    const snapped = snapScore(v)
    setValue(snapped)
    setText(String(snapped))
    onPick(snapped)
  }

  const commitText = () => {
    const parsed = Number(text.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setText(mine ? String(mine) : '')
      setValue(mine ?? 7)
      return
    }
    commit(parsed)
  }

  const bump = (delta: number) => commit(value + delta)

  return createPortal(
    <div
      className="fixed z-[130] w-[286px] rounded-2xl border border-white/10 bg-[#0b0d15]/97 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 flex items-center gap-2 px-0.5">
        <div className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
          {item.title}
        </div>
        <div
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: tier?.to }}
          title="Тир, в который попадёт карточка с учётом средней оценки"
        >
          {tier?.caption ?? '—'}
        </div>
      </div>

      {/* значение + шаг */}
      <div className="mb-2 flex items-center gap-2">
        <input
          className="score-input font-display w-[74px] rounded-xl border border-white/10 bg-white/[.05] px-2 text-center text-[34px] leading-none outline-none transition focus:border-amber-400/60 focus:bg-white/[.08]"
          value={text}
          inputMode="decimal"
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitText()
              e.currentTarget.blur()
            }
          }}
          style={{ color: myTier?.to }}
          aria-label="Оценка"
        />
        <div className="flex flex-col gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.07] text-white/70 transition hover:bg-white/15 hover:text-white"
            onClick={() => bump(0.5)}
            title="+0.5"
          >
            <Plus size={13} />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.07] text-white/70 transition hover:bg-white/15 hover:text-white"
            onClick={() => bump(-0.5)}
            title="−0.5"
          >
            <Minus size={13} />
          </button>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="text-[9.5px] font-semibold uppercase tracking-wider text-white/25">
            шаг 0.1
          </div>
          <div className="truncate text-[10.5px] text-white/35">
            {mode === 'split' ? `${names[person === 'u1' ? 'u2' : 'u1']}: ${other ?? '—'}` : 'шкала 1–10'}
          </div>
        </div>
      </div>

      {/* ползунок */}
      <input
        type="range"
        className="score-range mb-3"
        min={SCORE_MIN}
        max={SCORE_MAX}
        step={0.1}
        value={value}
        onChange={(e) => commit(Number(e.target.value))}
        aria-label="Ползунок оценки"
      />

      {/* быстрый выбор целых */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const t = tierForScore(n)
          const active = Math.round(value) === n
          return (
            <button
              key={n}
              onClick={() => commit(n)}
              className="h-9 rounded-xl border text-[14px] font-semibold transition-all duration-150 hover:scale-[1.06]"
              style={{
                borderColor: active ? t?.to : `${t?.to}38`,
                background: active
                  ? `linear-gradient(160deg, ${t?.from}, ${t?.to})`
                  : `${t?.to}14`,
                color: active ? '#0a0c14' : t?.to,
                boxShadow: active ? `0 8px 22px -10px ${t?.glow}` : 'none',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[.07] px-0.5 pt-2.5 text-[11px]">
        <span style={{ color: tier?.to }} className="font-semibold uppercase tracking-wider">
          {tier ? `${tier.letter} · ${tier.caption}` : 'без оценки'}
          {mode === 'split' && other !== undefined && (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-white/30">
              средняя {Math.round(resultAvg * 100) / 100}
            </span>
          )}
        </span>
        {mine ? (
          <button
            className="text-white/35 transition hover:text-rose-300"
            onClick={() => {
              onPick(undefined)
              onClose()
            }}
          >
            снять оценку
          </button>
        ) : (
          <span className="text-white/25">{TIERS.length} тиров</span>
        )}
      </div>
    </div>,
    document.body,
  )
}
