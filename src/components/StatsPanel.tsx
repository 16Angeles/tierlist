import { useMemo } from 'react'
import { BarChart3, Crown, Flame } from 'lucide-react'
import type { Item, Mode, PersonId } from '../types'
import { TIERS, displayedScore, tierForItem } from '../lib/tiers'
import { formatScore } from '../lib/utils'

export function StatsPanel({
  items,
  mode,
  person,
  names,
}: {
  items: Item[]
  mode: Mode
  person: PersonId
  names: Record<PersonId, string>
}) {
  const stats = useMemo(() => {
    const rated = items.filter((i) => tierForItem(i, mode))
    const scores = rated.map((i) => displayedScore(i, mode) ?? 0)
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }
    for (const it of rated) {
      const t = tierForItem(it, mode)
      if (t) counts[t.id]++
    }
    const sorted = [...rated].sort(
      (a, b) => (displayedScore(b, mode) ?? 0) - (displayedScore(a, mode) ?? 0),
    )
    const top = sorted.slice(0, 3)
    const topIds = new Set(top.map((i) => i.id))
    const bottom = sorted
      .slice()
      .reverse()
      .filter((i) => !topIds.has(i.id))
      .slice(0, 3)
    const mine = items.filter((i) => i.ratings[mode === 'shared' ? 'shared' : person]?.score)
    const theirs = mode === 'split' ? items.filter((i) => i.ratings[person === 'u1' ? 'u2' : 'u1']?.score) : []
    return {
      avg,
      total: items.length,
      rated: rated.length,
      counts,
      top,
      bottom,
      mine: mine.length,
      theirs: theirs.length,
    }
  }, [items, mode, person])

  const max = Math.max(1, ...Object.values(stats.counts))

  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={15} className="text-white/45" />
        <h2 className="text-[13px] font-semibold text-white/85">Статистика</h2>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="font-display text-[52px] leading-[0.8] tracking-wide text-white">
          {stats.rated ? formatScore(stats.avg) : '—'}
        </div>
        <div className="pb-1 text-[11px] leading-tight text-white/35">
          средняя оценка
          <br />
          {stats.rated} из {stats.total}
        </div>
      </div>

      <div className="mb-4 space-y-1.5">
        {TIERS.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5">
            <span
              className="w-4 shrink-0 text-center font-display text-[15px] leading-none"
              style={{ color: t.to }}
            >
              {t.letter}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${(stats.counts[t.id] / max) * 100}%`,
                  background: `linear-gradient(90deg, ${t.from}, ${t.to})`,
                  boxShadow: `0 0 12px ${t.glow}`,
                }}
              />
            </div>
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-white/40">
              {stats.counts[t.id]}
            </span>
          </div>
        ))}
      </div>

      {mode === 'split' && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-2">
            <div className="truncate text-[10px] uppercase tracking-wider text-white/35">
              {names[person]}
            </div>
            <div className="font-display text-[24px] leading-none text-white/80">
              {stats.mine}
            </div>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-2">
            <div className="truncate text-[10px] uppercase tracking-wider text-white/35">
              {names[person === 'u1' ? 'u2' : 'u1']}
            </div>
            <div className="font-display text-[24px] leading-none text-white/80">
              {stats.theirs}
            </div>
          </div>
        </div>
      )}

      {stats.top.length > 0 && (
        <div className="space-y-2">
          <MiniList title="Любимые" icon={<Crown size={11} className="text-amber-400" />} items={stats.top} mode={mode} />
          {stats.bottom.length > 0 && stats.bottom[0]?.id !== stats.top[0]?.id && (
            <MiniList title="Антитоп" icon={<Flame size={11} className="text-rose-400" />} items={stats.bottom} mode={mode} />
          )}
        </div>
      )}
    </section>
  )
}

function MiniList({
  title,
  icon,
  items,
  mode,
}: {
  title: string
  icon: React.ReactNode
  items: Item[]
  mode: Mode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
        {icon}
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it) => {
          const s = displayedScore(it, mode)
          return (
            <li key={it.id} className="flex items-center gap-2 text-[11.5px]">
              <span className="min-w-0 flex-1 truncate text-white/65">{it.title}</span>
              <span className="shrink-0 tabular-nums text-white/40">{formatScore(s)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
