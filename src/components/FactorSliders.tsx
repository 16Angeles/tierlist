import { FACTORS } from '../types'
import type { Factors, Weights } from '../types'
import { FACTOR_MAX, FACTOR_MIN, FACTOR_STEP, weightPercents } from '../lib/factors'
import { tierForScore } from '../lib/tiers'

const GRADIENT =
  'linear-gradient(90deg, #f43f5e 0%, #fb7185 18%, #f59e0b 45%, #a3e635 68%, #10b981 100%)'

/** Пять ползунков: сюжет, развлекательность, музыка, атмосфера, пересмотрибельность */
export function FactorSliders({
  value,
  onChange,
  weights,
  hints = false,
  showWeights = false,
  dim = false,
}: {
  value: Factors
  onChange: (f: Factors) => void
  weights?: Weights | null
  /** подписи-пояснения под названием фактора */
  hints?: boolean
  /** показывать процент веса фактора */
  showWeights?: boolean
  /** приглушённый вид (факторы ещё не выставлены) */
  dim?: boolean
}) {
  const pct = weightPercents(weights)
  return (
    <div className={dim ? 'space-y-2 opacity-50' : 'space-y-2.5'}>
      {FACTORS.map((f) => {
        const v = value[f.id]
        const t = tierForScore(v)
        const p = ((v - FACTOR_MIN) / (FACTOR_MAX - FACTOR_MIN)) * 100
        return (
          <div key={f.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[11.5px] font-medium text-white/70">
                {f.label}
                {hints && (
                  <span className="ml-1.5 text-[10px] font-normal text-white/25">{f.hint}</span>
                )}
              </span>
              <span
                className="shrink-0 text-[12px] font-bold tabular-nums"
                style={{ color: t?.to ?? 'rgba(255,255,255,.7)' }}
              >
                {v}
              </span>
            </div>
            <div className="relative h-[6px] rounded-full bg-white/[.07]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
                style={{
                  width: `${p}%`,
                  background: GRADIENT,
                  boxShadow: '0 0 10px rgba(245,158,11,.22)',
                }}
              />
              <input
                type="range"
                className="factor-range absolute left-0 top-1/2 w-full -translate-y-1/2"
                min={FACTOR_MIN}
                max={FACTOR_MAX}
                step={FACTOR_STEP}
                value={v}
                onChange={(e) => onChange({ ...value, [f.id]: Number(e.target.value) })}
                aria-label={f.label}
              />
            </div>
            {showWeights && (
              <div className="mt-0.5 text-right text-[9.5px] tabular-nums text-white/25">
                вес {pct[f.id]}%
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
