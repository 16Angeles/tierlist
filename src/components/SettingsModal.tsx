import { useEffect, useState } from 'react'
import {
  Check,
  Cloud,
  Copy,
  Download,
  GitBranch,
  HardDrive,
  Link2,
  Plug,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  Users,
} from 'lucide-react'
import { Modal } from './Modal'
import type { SyncConfig } from '../lib/sync'
import { createAdapter, shareableConfig } from '../lib/sync'
import { copyText, download, uid } from '../lib/utils'
import { toast } from '../lib/toast'
import type { Doc, Mode, PersonId, Weights } from '../types'
import { FACTORS } from '../types'
import { DEFAULT_WEIGHTS, normalizeWeights, weightPercents } from '../lib/factors'

type Tab = 'connect' | 'people' | 'factors' | 'data'

export function SettingsModal({
  open,
  onClose,
  config,
  updateConfig,
  doc,
  setMeta,
  setMode,
  importDoc,
  resetDoc,
  person,
  onPerson,
  setWeights,
}: {
  open: boolean
  onClose: () => void
  config: SyncConfig
  updateConfig: (patch: Partial<SyncConfig>) => void
  doc: Doc
  setMeta: (patch: Partial<Doc['meta']>) => void
  setMode: (m: Mode) => void
  importDoc: (raw: unknown) => void
  resetDoc: () => void
  person: PersonId
  onPerson: (p: PersonId) => void
  setWeights: (w: Weights) => void
}) {
  const [tab, setTab] = useState<Tab>('connect')
  const [draft, setDraft] = useState<SyncConfig>(config)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)

  // готовая ссылка для друга: всё кроме токена уже подставлено
  const inviteLink = (() => {
    const params = new URLSearchParams()
    params.set('backend', config.backend)
    if (config.backend === 'github' && config.ghOwner && config.ghRepo) {
      params.set('gh', `${config.ghOwner}/${config.ghRepo}`)
      params.set('branch', config.ghBranch)
      params.set('path', config.ghPath)
    }
    if (config.backend === 'supabase' && config.sbUrl) params.set('sb', config.sbUrl)
    params.set('list', config.listId || 'our-list')
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`
  })()

  useEffect(() => {
    if (open) {
      setDraft(config)
      setTestResult(null)
      setImportText('')
      setShowImport(false)
    }
  }, [open, config])

  const applyDraft = () => {
    updateConfig(draft)
    toast('Настройки подключения сохранены')
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const cfg = { ...draft, listId: draft.listId || 'test' }
      const adapter = createAdapter(cfg)
      const remote = await adapter.load()
      setTestResult({
        ok: true,
        text: remote
          ? `Подключение работает. В списке ${remote.items.length} фильмов.`
          : 'Подключение работает. Удалённый список пока пуст.',
      })
    } catch (e) {
      setTestResult({
        ok: false,
        text: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setTesting(false)
    }
  }

  async function copyLink() {
    const ok = await copyText(inviteLink)
    toast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать', ok ? 'ok' : 'err')
  }

  async function copyConfig() {
    const ok = await copyText(JSON.stringify(shareableConfig(config), null, 2))
    toast(ok ? 'Настройки скопированы — отправьте их другу' : 'Не удалось скопировать', ok ? 'ok' : 'err')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Настройки"
      subtitle="Подключение, участники и данные тирлиста"
      maxWidth="max-w-2xl"
    >
      <div className="mb-5 flex gap-1 rounded-xl border border-white/[.08] bg-white/[.03] p-1">
        {(
          [
            { id: 'connect', label: 'Подключение', icon: <Plug size={13} /> },
            { id: 'people', label: 'Участники', icon: <Users size={13} /> },
            { id: 'factors', label: 'Факторы', icon: <SlidersHorizontal size={13} /> },
            { id: 'data', label: 'Данные', icon: <Cloud size={13} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition ${
              tab === t.id ? 'bg-white/[.1] text-white' : 'text-white/45 hover:text-white/75'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'connect' && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                { id: 'local', label: 'Локально', desc: 'Без сети', icon: <HardDrive size={14} /> },
                { id: 'github', label: 'GitHub', desc: 'Файл в репо', icon: <GitBranch size={14} /> },
                { id: 'supabase', label: 'Supabase', desc: 'Real-time', icon: <Cloud size={14} /> },
              ] as const
            ).map((b) => (
              <button
                key={b.id}
                onClick={() => setDraft((d) => ({ ...d, backend: b.id }))}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  draft.backend === b.id
                    ? 'border-amber-400/50 bg-amber-400/[.08]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/20'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
                  {b.icon}
                  {b.label}
                </span>
                <span className="text-[10.5px] text-white/40">{b.desc}</span>
              </button>
            ))}
          </div>

          {draft.backend === 'local' && (
            <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-4 text-[12.5px] leading-relaxed text-white/55">
              Список хранится только в этом браузере. Чтобы работать вдвоём с разных компьютеров,
              переключитесь на <b className="text-white/80">GitHub</b> — данные будут лежать в файле
              вашего репозитория и обновляться автоматически.
            </div>
          )}

          {draft.backend === 'github' && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
                    Владелец
                  </span>
                  <input
                    className="field"
                    value={draft.ghOwner}
                    placeholder="my-github-username"
                    onChange={(e) => setDraft((d) => ({ ...d, ghOwner: e.target.value.trim() }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Репозиторий</span>
                  <input
                    className="field"
                    value={draft.ghRepo}
                    placeholder="our-tierlist"
                    onChange={(e) => setDraft((d) => ({ ...d, ghRepo: e.target.value.trim() }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Ветка</span>
                  <input
                    className="field"
                    value={draft.ghBranch}
                    placeholder="main"
                    onChange={(e) => setDraft((d) => ({ ...d, ghBranch: e.target.value.trim() }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
                    Файл с данными
                  </span>
                  <input
                    className="field"
                    value={draft.ghPath}
                    placeholder="tierlist.json"
                    onChange={(e) => setDraft((d) => ({ ...d, ghPath: e.target.value.trim() }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
                  Personal Access Token
                </span>
                <input
                  className="field"
                  type="password"
                  value={draft.ghToken}
                  placeholder="github_pat_…"
                  onChange={(e) => setDraft((d) => ({ ...d, ghToken: e.target.value.trim() }))}
                />
                <span className="mt-1.5 block text-[10.5px] leading-relaxed text-white/30">
                  Токен хранится только в вашем браузере. Права: <code>Contents: Read and write</code>.
                  Друг должен иметь доступ к репозиторию на запись.
                </span>
              </label>
            </div>
          )}

          {draft.backend === 'supabase' && (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">URL проекта</span>
                <input
                  className="field"
                  value={draft.sbUrl}
                  placeholder="https://xxxx.supabase.co"
                  onChange={(e) => setDraft((d) => ({ ...d, sbUrl: e.target.value.trim() }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">anon public key</span>
                <input
                  className="field"
                  type="password"
                  value={draft.sbKey}
                  placeholder="eyJhbGciOi…"
                  onChange={(e) => setDraft((d) => ({ ...d, sbKey: e.target.value.trim() }))}
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
              ID списка (одинаковый у обоих участников)
            </span>
            <div className="flex gap-2">
              <input
                className="field"
                value={draft.listId}
                placeholder="our-list"
                onChange={(e) => setDraft((d) => ({ ...d, listId: e.target.value.trim() }))}
              />
              <button
                className="btn btn-ghost shrink-0"
                onClick={() => setDraft((d) => ({ ...d, listId: uid('list') }))}
                title="Сгенерировать новый"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button className="btn btn-ghost" onClick={testConnection} disabled={testing}>
              {testing ? 'Проверяем…' : 'Проверить подключение'}
            </button>
            <button className="btn btn-primary" onClick={applyDraft}>
              <Check size={14} /> Сохранить
            </button>
            {testResult && (
              <span
                className={`text-[12px] ${testResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {testResult.text}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4 text-[11.5px] leading-relaxed text-white/45">
            <b className="text-white/70">Как настроить GitHub:</b>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>Создайте репозиторий (лучше приватный) и пригласите друга как Collaborator.</li>
              <li>
                Создайте Personal Access Token (GitHub → Settings → Developer settings → Personal
                access tokens → Fine-grained) с правом <b>Contents: Read and write</b> на этот репозиторий.
              </li>
              <li>Впишите владельца, репозиторий, ветку и токен сюда — у обоих участников настройки одинаковые.</li>
              <li>Данные будут храниться в файле <code>tierlist.json</code> и обновляться каждые 5 секунд.</li>
            </ol>
          </div>
        </div>
      )}

      {tab === 'people' && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Название тирлиста</span>
            <input
              className="field"
              value={doc.meta.name}
              onChange={(e) => setMeta({ name: e.target.value })}
              placeholder="Наш тирлист"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Режим оценок</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setMode('shared')}
                className={`rounded-xl border p-3 text-left transition ${
                  doc.meta.mode === 'shared'
                    ? 'border-amber-400/50 bg-amber-400/[.08]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/20'
                }`}
              >
                <div className="text-[12.5px] font-semibold text-white">Общая оценка</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-white/40">
                  Один голос на фильм. Подходит, если вы решаете вместе.
                </div>
              </button>
              <button
                onClick={() => setMode('split')}
                className={`rounded-xl border p-3 text-left transition ${
                  doc.meta.mode === 'split'
                    ? 'border-amber-400/50 bg-amber-400/[.08]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/20'
                }`}
              >
                <div className="text-[12.5px] font-semibold text-white">Раздельные оценки</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-white/40">
                  У каждого своя оценка, тир определяется по среднему.
                </div>
              </button>
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Имя участника 1</span>
              <input
                className="field"
                value={doc.meta.people.u1}
                onChange={(e) => setMeta({ people: { ...doc.meta.people, u1: e.target.value } })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Имя участника 2</span>
              <input
                className="field"
                value={doc.meta.people.u2}
                onChange={(e) => setMeta({ people: { ...doc.meta.people, u2: e.target.value } })}
              />
            </label>
          </div>

          {doc.meta.mode === 'split' && (
            <div>
              <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
                Кто вы на этом устройстве?
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'u1' as PersonId, label: doc.meta.people.u1 || 'Участник 1' },
                    { id: 'u2' as PersonId, label: doc.meta.people.u2 || 'Участник 2' },
                  ]
                ).map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onPerson(w.id)}
                    className={`rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition ${
                      person === w.id
                        ? 'border-amber-400/50 bg-amber-400/[.08] text-white'
                        : 'border-white/[.08] bg-white/[.025] text-white/55 hover:border-white/20'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/30">
                Выбор сохраняется только на этом устройстве. На компьютере друга нужно будет выбрать своё
                имя — тогда каждый ставит свою оценку, а тир считается по средней.
              </p>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
              Ключ TMDB (необязательно) — для поиска фильмов постеров
            </span>
            <input
              className="field"
              type="password"
              value={config.tmdbKey}
              placeholder="https://www.themoviedb.org/settings/api"
              onChange={(e) => updateConfig({ tmdbKey: e.target.value.trim() })}
            />
          </label>
        </div>
      )}

      {tab === 'factors' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[.08] bg-white/[.025] p-4 text-[12px] leading-relaxed text-white/50">
            Итоговая оценка фильма считается как <b className="text-white/80">взвешенное среднее</b> по
            пяти факторам. Ниже можно изменить вклад каждого фактора — оценки пересчитаются
            автоматически у обоих участников.
          </div>

          <div className="space-y-3">
            {FACTORS.map((f) => {
              const w = normalizeWeights(doc.meta.weights)
              const pct = weightPercents(doc.meta.weights)[f.id]
              return (
                <div key={f.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12px] font-medium text-white/70">
                      {f.label}
                      <span className="ml-1.5 text-[10.5px] font-normal text-white/30">{f.hint}</span>
                    </span>
                    <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-white/50">
                      {pct}%
                    </span>
                  </div>
                  <div className="relative h-[6px] rounded-full bg-white/[.07]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-400/70 transition-[width] duration-150"
                      style={{ width: `${(w[f.id] / 3) * 100}%` }}
                    />
                    <input
                      type="range"
                      className="factor-range absolute left-0 top-1/2 w-full -translate-y-1/2"
                      min={0}
                      max={3}
                      step={0.5}
                      value={w[f.id]}
                      onChange={(e) =>
                        setWeights({ ...normalizeWeights(doc.meta.weights), [f.id]: Number(e.target.value) })
                      }
                      aria-label={`Вес фактора «${f.label}»`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setWeights({ ...DEFAULT_WEIGHTS })
                toast('Веса факторов сброшены')
              }}
            >
              <RotateCcw size={14} /> Равные веса
            </button>
            <span className="text-[11px] text-white/30">
              Сейчас: {FACTORS.map((f) => `${f.label} ${weightPercents(doc.meta.weights)[f.id]}%`).join(' · ')}
            </span>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="btn btn-ghost justify-start"
              onClick={() => {
                download(`tierlist-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(doc, null, 2))
                toast('Файл сохранён')
              }}
            >
              <Download size={14} /> Выгрузить в JSON
            </button>
            <button className="btn btn-ghost justify-start" onClick={() => setShowImport((v) => !v)}>
              <Upload size={14} /> Загрузить из JSON
            </button>
            <button className="btn btn-ghost justify-start" onClick={copyLink}>
              <Link2 size={14} /> Скопировать ссылку
            </button>
            <button className="btn btn-ghost justify-start" onClick={copyConfig}>
              <Copy size={14} /> Скопировать настройки
            </button>
          </div>

          <div className="rounded-xl border border-white/[.08] bg-white/[.025] p-3">
            <div className="mb-1.5 text-[11.5px] font-semibold text-white/70">
              Ссылка-приглашение для друга
            </div>
            <div className="break-all rounded-lg bg-black/30 px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-white/45">
              {inviteLink}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-white/35">
              Друг открывает ссылку — репозиторий и ID списка подставятся автоматически,
              останется только вставить свой токен.
            </div>
          </div>

          {showImport && (
            <div>
              <textarea
                className="field min-h-[120px] font-mono !text-[11px]"
                placeholder="Вставьте сюда содержимое JSON-файла…"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button
                className="btn btn-primary mt-2"
                disabled={!importText.trim()}
                onClick={() => {
                  try {
                    importDoc(JSON.parse(importText))
                    toast('Данные загружены')
                    setShowImport(false)
                    setImportText('')
                  } catch {
                    toast('Не похоже на корректный JSON', 'err')
                  }
                }}
              >
                Загрузить
              </button>
            </div>
          )}

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.06] p-4">
            <div className="text-[12.5px] font-semibold text-rose-200">Опасная зона</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
              Полностью очистить тирлист. Действие необратимо — сначала выгрузите копию.
            </p>
            <button
              className="btn btn-ghost mt-2.5 !border-rose-400/30 !text-rose-300 hover:!bg-rose-500/10"
              onClick={() => {
                if (confirm('Очистить весь тирлист?')) {
                  resetDoc()
                  toast('Тирлист очищен', 'info')
                }
              }}
            >
              <RotateCcw size={14} /> Очистить всё
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
