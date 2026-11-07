import { useEffect, useState } from 'react'
import {
  CloudOff,
  RefreshCw,
  Search,
  Settings,
  Users,
  X,
  Plus,
  Check,
  Wifi,
  AlertTriangle,
} from 'lucide-react'
import type { Mode, PersonId } from '../types'
import type { SyncStatus } from '../lib/sync'
import { relativeTime } from '../lib/utils'

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl border border-white/[.09] bg-white/[.035] p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-medium transition-all ${
              active
                ? 'bg-white/[.13] text-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.9)]'
                : 'text-white/45 hover:text-white/75'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function TopBar({
  mode,
  onMode,
  person,
  onPerson,
  personNames,
  status,
  error,
  lastSync,
  adapterLabel,
  query,
  onQuery,
  onOpenSettings,
  onAdd,
}: {
  mode: Mode
  onMode: (m: Mode) => void
  person: PersonId
  onPerson: (p: PersonId) => void
  personNames: { u1: string; u2: string }
  status: SyncStatus
  error: string | null
  lastSync: number | null
  adapterLabel: string
  query: string
  onQuery: (q: string) => void
  onOpenSettings: () => void
  onAdd: () => void
}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 15000)
    return () => window.clearInterval(t)
  }, [])
  void tick

  const statusMeta: Record<SyncStatus, { label: string; dot: string; icon: React.ReactNode }> = {
    local: { label: 'Локально', dot: 'bg-white/30', icon: <CloudOff size={12} /> },
    connecting: { label: 'Подключение…', dot: 'bg-amber-400 animate-pulse', icon: <RefreshCw size={12} className="animate-spin" /> },
    syncing: { label: 'Синхронизация', dot: 'bg-amber-400 animate-pulse', icon: <RefreshCw size={12} className="animate-spin" /> },
    synced: { label: 'Синхронизировано', dot: 'bg-emerald-400', icon: <Wifi size={12} /> },
    error: { label: 'Ошибка связи', dot: 'bg-rose-500', icon: <AlertTriangle size={12} /> },
  }
  const s = statusMeta[status]

  return (
    <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#07080d]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1720px] items-center gap-3 px-3 py-2.5 sm:px-5">
        {/* логотип */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_8px_20px_-8px_rgba(245,158,11,0.8)]">
            <div
              className="absolute inset-0 rounded-xl"
              style={{ background: 'linear-gradient(140deg, #a78bfa, #f59e0b)' }}
            />
            <span className="relative font-display text-[22px] leading-none text-[#0a0c14]">T</span>
          </div>
          <div className="hidden leading-none sm:block">
            <div
              className="font-display text-[22px] tracking-wide"
              style={{
                background: 'linear-gradient(100deg, #fff, #fcd34d)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              TIERS
            </div>
            <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.18em] text-white/30">
              тирлист кино
            </div>
          </div>
        </div>

        {/* поиск */}
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Поиск по тирлисту…"
            className="field !py-2 !pl-9 !pr-8 !text-[12.5px]"
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-white"
              onClick={() => onQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* режим оценок */}
          <div className="hidden md:block">
            <Segmented<Mode>
              value={mode}
              onChange={onMode}
              options={[
                { value: 'shared', label: 'Общая' },
                { value: 'split', label: 'Раздельная', icon: <Users size={12} /> },
              ]}
            />
          </div>

          {/* переключатель «кто я» */}
          {mode === 'split' && (
            <Segmented<PersonId>
              value={person}
              onChange={onPerson}
              options={[
                { value: 'u1', label: personNames.u1 || 'Я' },
                { value: 'u2', label: personNames.u2 || 'Друг' },
              ]}
            />
          )}

          {/* статус синхронизации */}
          <button
            onClick={onOpenSettings}
            title={error ?? adapterLabel}
            className="hidden items-center gap-1.5 rounded-xl border border-white/[.09] bg-white/[.035] px-2.5 py-1.5 text-[11px] font-medium text-white/55 transition hover:border-white/20 hover:text-white lg:flex"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.icon}
            <span className="max-w-[150px] truncate">{s.label}</span>
            {status === 'synced' && lastSync && (
              <span className="text-white/25">· {relativeTime(lastSync)}</span>
            )}
          </button>

          <button className="btn-icon" onClick={onOpenSettings} aria-label="Настройки">
            <Settings size={17} />
          </button>

          <button className="btn btn-primary" onClick={onAdd}>
            <Plus size={15} /> <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>
      </div>

      {/* мобильный ряд */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-white/[.05] px-3 py-2 md:hidden">
        <Segmented<Mode>
          value={mode}
          onChange={onMode}
          options={[
            { value: 'shared', label: 'Общая' },
            { value: 'split', label: 'Раздельная' },
          ]}
        />
        {mode === 'split' && (
          <Segmented<PersonId>
            value={person}
            onChange={onPerson}
            options={[
              { value: 'u1', label: personNames.u1 || 'Я' },
              { value: 'u2', label: personNames.u2 || 'Друг' },
            ]}
          />
        )}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-white/45">
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.icon}
          {s.label}
        </div>
      </div>
    </header>
  )
}

export function StatusDot({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, string> = {
    local: 'bg-white/30',
    connecting: 'bg-amber-400',
    syncing: 'bg-amber-400',
    synced: 'bg-emerald-400',
    error: 'bg-rose-500',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${map[status]}`} />
      {status === 'synced' && <Check size={12} className="text-emerald-400" />}
    </span>
  )
}
