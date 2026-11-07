import { useEffect, useState } from 'react'
import { Link2, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { FactorSliders } from './FactorSliders'
import type { Factors, Item, Kind, Mode, PersonId, Weights } from '../types'
import { KIND_LABEL } from '../types'
import { DEFAULT_FACTORS, factorsScore, ratingFactors } from '../lib/factors'
import { tierForScore } from '../lib/tiers'

interface TmdbResult {
  id: number
  title: string
  year: number
  poster: string
  kind: Kind
}

const KINDS: Kind[] = ['movie', 'series', 'anime', 'game', 'book', 'other']

export function AddItemModal({
  open,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  editing,
  tmdbKey,
  mode,
  person,
  weights,
  onFactors,
}: {
  open: boolean
  onClose: () => void
  onAdd: (data: Partial<Item>) => void
  onUpdate: (id: string, patch: Partial<Item>) => void
  onDelete: (id: string) => void
  editing: Item | null
  tmdbKey: string
  mode: Mode
  person: PersonId
  weights?: Weights | null
  onFactors: (id: string, factors: Factors | undefined) => void
}) {
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [kind, setKind] = useState<Kind>('movie')
  const [poster, setPoster] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TmdbResult[]>([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [draft, setDraft] = useState<Factors>({ ...DEFAULT_FACTORS })
  const [factorsOn, setFactorsOn] = useState(false)

  useEffect(() => {
    if (!open) return
    const key = mode === 'shared' ? 'shared' : person
    const existing = editing ? ratingFactors(editing.ratings[key]) : null
    setDraft(existing ?? { ...DEFAULT_FACTORS })
    setFactorsOn(!!existing)
    if (editing) {
      setTitle(editing.title)
      setYear(editing.year ? String(editing.year) : '')
      setKind(editing.kind)
      setPoster(editing.poster ?? '')
      setUrl(editing.url ?? '')
      setNote(editing.note ?? '')
    } else {
      setTitle('')
      setYear('')
      setKind('movie')
      setPoster('')
      setUrl('')
      setNote('')
    }
    setQ('')
    setResults([])
    setSearched(false)
  }, [open, editing, mode, person])

  async function tmdbSearch() {
    if (!tmdbKey || !q.trim()) return
    setBusy(true)
    setSearched(true)
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q.trim())}&language=ru-RU&include_adult=false`,
        { headers: { Authorization: `Bearer ${tmdbKey}` } },
      )
      const json = await res.json()
      const list: TmdbResult[] = (json.results ?? [])
        .filter((r: any) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
        .slice(0, 12)
        .map((r: any) => ({
          id: r.id,
          title: r.title ?? r.name ?? 'Без названия',
          year: Number((r.release_date ?? r.first_air_date ?? '').slice(0, 4)) || undefined,
          poster: `https://image.tmdb.org/t/p/w342${r.poster_path}`,
          kind: r.media_type === 'tv' ? 'series' : 'movie',
        }))
      setResults(list)
    } catch {
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  const derived = factorsOn ? factorsScore(draft, weights) : null
  const derivedTier = tierForScore(derived ?? undefined)

  function submit() {
    if (!title.trim()) return
    const data: Partial<Item> = {
      title: title.trim(),
      year: year ? Number(year) : undefined,
      kind,
      poster: poster.trim() || undefined,
      url: url.trim() || undefined,
      note: note.trim() || undefined,
    }
    if (editing) {
      onUpdate(editing.id, data)
      const key = mode === 'shared' ? 'shared' : person
      const before = ratingFactors(editing.ratings[key])
      const same = JSON.stringify(before ?? null) === JSON.stringify(factorsOn ? draft : null)
      if (!same) onFactors(editing.id, factorsOn ? draft : undefined)
    } else {
      if (factorsOn && derived !== null) {
        const key = mode === 'shared' ? 'shared' : person
        data.ratings = {
          [key]: { score: derived, factors: draft, updatedAt: Date.now() },
        }
      }
      onAdd(data)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Редактировать' : 'Добавить фильм'}
      subtitle={
        editing
          ? 'Измените данные — они синхронизируются с друзьями'
          : 'Перетащите карточку в тир — оценка проставится автоматически'
      }
      footer={
        <>
          {editing && (
            <button
              className="btn btn-ghost mr-auto !text-rose-300 hover:!border-rose-400/40 hover:!bg-rose-500/10"
              onClick={() => {
                onDelete(editing.id)
                onClose()
              }}
            >
              <Trash2 size={14} /> Удалить
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!title.trim()}>
            {editing ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      {tmdbKey && !editing && (
        <div className="mb-5 rounded-2xl border border-white/[.08] bg-white/[.03] p-3">
          <div className="mb-2 flex items-center gap-2">
            <Search size={13} className="text-white/40" />
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-white/45">
              Поиск в TMDB
            </span>
          </div>
          <div className="flex gap-2">
            <input
              className="field !py-2 !text-[12.5px]"
              value={q}
              placeholder="Например, «Начало» или «Breaking Bad»"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') tmdbSearch()
              }}
            />
            <button className="btn btn-ghost shrink-0" onClick={tmdbSearch} disabled={busy || !q.trim()}>
              {busy ? 'Ищем…' : 'Найти'}
            </button>
          </div>
          {results.length > 0 && (
            <div className="mt-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto scroll-thin sm:grid-cols-4">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setTitle(r.title)
                    setYear(r.year ? String(r.year) : '')
                    setKind(r.kind)
                    setPoster(r.poster)
                    setResults([])
                  }}
                  className="group overflow-hidden rounded-lg border border-white/[.08] text-left transition hover:border-amber-400/60"
                >
                  <img src={r.poster} alt="" className="aspect-[2/3] w-full object-cover" loading="lazy" />
                  <div className="p-1.5">
                    <div className="line-clamp-2 text-[10.5px] font-medium leading-tight text-white/80">
                      {r.title}
                    </div>
                    <div className="text-[9.5px] text-white/35">{r.year ?? ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searched && results.length === 0 && !busy && (
            <div className="mt-2 text-[11.5px] text-white/35">Ничего не найдено — заполните форму вручную.</div>
          )}
        </div>
      )}

      <div className="space-y-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Название *</span>
          <input
            autoFocus
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, «Остров проклятых»"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Год</span>
            <input
              className="field"
              value={year}
              inputMode="numeric"
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2010"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Тип</span>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {KINDS.map((k) => (
                <option key={k} value={k} className="bg-[#0b0d15]">
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Постер (ссылка на картинку)</span>
          <input
            className="field"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
            placeholder="https://…"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-white/50">
            <Link2 size={12} /> Ссылка (IMDb, Кинопоиск, YouTube…)
          </span>
          <input
            className="field"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Заметка</span>
          <textarea
            className="field min-h-[64px] resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Почему такая оценка?"
          />
        </label>
      </div>

      {/* шкала по 5 факторам */}
      <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.03] p-3.5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-white/50">
              <SlidersHorizontal size={13} className="text-amber-400/80" />
              Оценка по 5 факторам
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-white/35">
              {mode === 'split'
                ? 'Ваши оценки — у друга свои. Итог тирлиста считается по средней.'
                : 'Итоговая оценка в тирлисте считается сама из пяти ползунков.'}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div
              className="font-display text-[30px] leading-none"
              style={{ color: derivedTier?.to ?? 'rgba(255,255,255,.3)' }}
            >
              {derived !== null ? derived.toFixed(1) : '—'}
            </div>
            <div
              className="mt-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: derivedTier?.to ?? 'rgba(255,255,255,.25)' }}
            >
              {derivedTier ? `${derivedTier.letter} · ${derivedTier.caption}` : 'итог'}
            </div>
          </div>
        </div>

        <FactorSliders
          value={draft}
          onChange={(f) => {
            setDraft(f)
            setFactorsOn(true)
          }}
          weights={weights}
          hints
          dim={!factorsOn}
        />

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[.07] pt-2.5">
          <span className="text-[10.5px] leading-relaxed text-white/30">
            {factorsOn
              ? 'Итог пересчитывается автоматически при изменении весов факторов.'
              : 'Сдвиньте любой ползунок, чтобы оценить по факторам.'}
          </span>
          {factorsOn && (
            <button
              className="btn btn-ghost shrink-0 !px-2.5 !py-1 !text-[11px]"
              onClick={() => setFactorsOn(false)}
            >
              без факторов
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
