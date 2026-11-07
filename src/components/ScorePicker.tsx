import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { SCORE_MAX, SCORE_MIN, TIERS, snapScore, tierForScore } from '../lib/tiers'
import type { Factors, Item, Mode, PersonId, Weights } from '../types'
import { DEFAULT_FACTORS, factorsScore, ratingFactors } from '../lib/factors'
import { FactorSliders } from './FactorSliders'

type Tab = 'score' | 'factors'

export function ScorePicker({
  position,
  item,
  mode,
  person,
  names,
  weights,
  onPick,
  onFactors,
  onClose,
}: {
  position: { x: number; y: number }
  item: Item
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
  weights?: Weights | null
  onPick: (score: number | undefined) => void
  onFactors: (factors: Factors | undefined) => void
  onClose: () => void
}) {
  const key = mode === 'shared' ? 'shared' : person
  const rating = item.ratings[key]
  const mine = rating?.score
  const other = mode === 'split' ? item.ratings[person === 'u1' ? 'u2' : 'u1']?.score : undefined
  const myFactors = ratingFactors(rating)

  const [tab, setTab] = useState<Tab>(myFactors ? 'factors' : 'score')
  const [value, setValue] = useState<number>(mine ?? 7)
  const [text, setText] = useState<string>(mine ? String(mine) : '')

  const boxRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(position)

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

  /* держим пикер в пределах экрана, даже когда он стал выше (вкладка с факторами) */
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const x = Math.min(Math.max(12, position.x), Math.max(12, window.innerWidth - w - 12))
    let y = position.y
    if (y + h > window.innerHeight - 12) y = Math.max(12, window.innerHeight - h - 12)
    setPos({ x, y })
  }, [position, tab])

  /* оценка могла измениться снаружи (например, из другого устройства) */
  useEffect(() => {
    if (mine === undefined) return
    setValue(mine)
    setText(String(mine))
  }, [mine])

  /* тир, в который попадёт карточка с учётом оценки второго участника */
  const factorScore = myFactors ? factorsScore(myFactors, weights) : undefined
  const effective = tab === 'factors' ? factorScore : value
  const resultAvg = other !== undefined && effective !== undefined ? (effective + other) / 2 : effective
  const tier = tierForScore(resultAvg)
  const myTier = tierForScore(effective)

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

  const commitFactors = (f: Factors) => onFactors(f)

  return createPortal(
    <div
      ref={boxRef}
      className="fixed z-[130] w-[300px] rounded-2xl border border-white/10 bg-[#0b0d15]/97 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
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

      {/* вкладки */}
      <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-xl border border-white/[.08] bg-white/[.03] p-0.5">
        <button
          onClick={() => setTab('score')}
          className={`rounded-[9px] py-1.5 text-[11.5px] font-medium transition ${
            tab === 'score' ? 'bg-white/[.13] text-white' : 'text-white/45 hover:text-white/75'
          }`}
        >
          Оценка
        </button>
        <button
          onClick={() => setTab('factors')}
          className={`flex items-center justify-center gap-1.5 rounded-[9px] py-1.5 text-[11.5px] font-medium transition ${
            tab === 'factors' ? 'bg-white/[.13] text-white' : 'text-white/45 hover:text-white/75'
          }`}
        >
          <SlidersHorizontal size={12} />
          По факторам
        </button>
      </div>

      {tab === 'score' ? (
        <>
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
                {mode === 'split'
                  ? `${names[person === 'u1' ? 'u2' : 'u1']}: ${other ?? '—'}`
                  : 'шкала 1–10'}
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

          {myFactors && (
            <div className="mt-2.5 rounded-lg border border-white/[.07] bg-white/[.03] px-2.5 py-1.5 text-[10.5px] leading-relaxed text-white/35">
              Оценка посчитана по 5 факторам. Чтобы поставить её вручную, перейдите на вкладку «По
              факторам» и сдвиньте любой ползунок.
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-2.5 py-2">
            <div
              className="font-display text-[30px] leading-none"
              style={{ color: myTier?.to ?? 'rgba(255,255,255,.7)' }}
            >
              {factorScore !== undefined ? factorScore.toFixed(1) : '—'}
            </div>
            <div className="min-w-0 flex-1 text-[10.5px] leading-tight text-white/40">
              <div>итог из 5 факторов</div>
              <div className="text-white/25">
                {mode === 'split'
                  ? `${names[person === 'u1' ? 'u2' : 'u1']}: ${other ?? '—'}`
                  : 'шкала 1–10'}
              </div>
            </div>
          </div>

          <FactorSliders
            value={myFactors ?? DEFAULT_FACTORS}
            onChange={commitFactors}
            weights={weights}
          />

          {!myFactors && (
            <div className="mt-2.5 rounded-lg border border-white/[.07] bg-white/[.03] px-2.5 py-1.5 text-[10.5px] leading-relaxed text-white/35">
              Сдвиньте любой ползунок — итоговая оценка и тир посчитаются сами.
            </div>
          )}
        </>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[.07] px-0.5 pt-2.5 text-[11px]">
        <span style={{ color: tier?.to }} className="font-semibold uppercase tracking-wider">
          {tier ? `${tier.letter} · ${tier.caption}` : 'без оценки'}
          {mode === 'split' && resultAvg !== undefined && (
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
