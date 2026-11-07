import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Doc, Item, Meta, Mode, PersonId } from '../types'
import {
  DEFAULT_CONFIG,
  configKey,
  createAdapter,
  type SyncAdapter,
  type SyncConfig,
  type SyncStatus,
} from '../lib/sync'
import { docsEqual, emptyDoc, makeItem, mergeDocs, normalizeDoc } from '../lib/doc'
import { readLocalDoc, writeLocalDoc } from '../lib/sync/local'
import { activePerson } from '../lib/tiers'

const CFG_KEY = 'tiers.config.v1'
const PERSONA_KEY = 'tiers.persona.v1'
const WELCOME_KEY = 'tiers.welcomed.v1'

function loadConfig(): SyncConfig {
  const base: SyncConfig = { ...DEFAULT_CONFIG }
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) Object.assign(base, JSON.parse(raw))
  } catch {
    /* ignore */
  }
  try {
    const params = new URLSearchParams(window.location.search)
    // ссылка-приглашение: ?gh=owner/repo&list=our-list&backend=github
    const gh = params.get('gh')
    if (gh && gh.includes('/')) {
      const [owner, repo] = gh.split('/')
      if (owner) base.ghOwner = owner
      if (repo) base.ghRepo = repo
    }
    const backend = params.get('backend')
    if (backend === 'github' || backend === 'supabase' || backend === 'local') {
      base.backend = backend
    }
    const list = params.get('list')
    if (list) base.listId = list
    const branch = params.get('branch')
    if (branch) base.ghBranch = branch
    const path = params.get('path')
    if (path) base.ghPath = path
    const sbUrl = params.get('sb')
    if (sbUrl) base.sbUrl = sbUrl
  } catch {
    /* ignore */
  }
  return base
}

export function useTierDoc() {
  const [config, setConfig] = useState<SyncConfig>(loadConfig)
  const [doc, setDoc] = useState<Doc>(() => readLocalDoc() ?? emptyDoc())
  const [person, setPersonState] = useState<PersonId>(() => {
    const raw = localStorage.getItem(PERSONA_KEY)
    return raw === 'u2' ? 'u2' : 'u1'
  })
  const [status, setStatus] = useState<SyncStatus>('local')
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [welcomed, setWelcomed] = useState<boolean>(() => localStorage.getItem(WELCOME_KEY) === '1')
  const dirtyRef = useRef(false)

  const adapter: SyncAdapter = useMemo(() => createAdapter(config), [configKey(config)])

  const setPerson = useCallback((p: PersonId) => {
    setPersonState(p)
    try {
      localStorage.setItem(PERSONA_KEY, p)
    } catch {
      /* ignore */
    }
  }, [])

  const updateConfig = useCallback((patch: Partial<SyncConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(CFG_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    setDirty(true)
  }, [])

  const mutate = useCallback(
    (fn: (d: Doc) => Doc) => {
      setDoc((prev) => {
        const next = fn(prev)
        return { ...next, updatedAt: Date.now() }
      })
      markDirty()
    },
    [markDirty],
  )

  /* ---- первичная загрузка + подписка на удалённые изменения ---- */
  useEffect(() => {
    let alive = true
    const isLocal = config.backend === 'local'
    if (isLocal) {
      setStatus('local')
      return
    }
    setStatus('connecting')
    ;(async () => {
      try {
        const remote = await adapter.load()
        if (!alive) return
        if (remote) {
          setDoc((prev) => {
            const merged = mergeDocs(prev, remote)
            if (!docsEqual(merged, remote)) markDirty()
            return merged
          })
          setLastSync(Date.now())
          setStatus('synced')
          setError(null)
        } else {
          setStatus('synced')
          setLastSync(Date.now())
          markDirty()
        }
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    })()

    const unsub = adapter.subscribe?.((remote) => {
      if (!remote) return
      setDoc((prev) => {
        const merged = mergeDocs(prev, remote)
        if (!docsEqual(merged, remote)) markDirty()
        return merged
      })
      setLastSync(Date.now())
      setStatus('synced')
      setError(null)
    })

    return () => {
      alive = false
      unsub?.()
    }
  }, [adapter, config.backend, markDirty])

  /* ---- автосохранение (с задержкой, чтобы не писать на каждый чих) ---- */
  useEffect(() => {
    writeLocalDoc(doc)
  }, [doc])

  useEffect(() => {
    if (!dirty) return
    const t = window.setTimeout(async () => {
      setStatus(config.backend === 'local' ? 'local' : 'syncing')
      try {
        await adapter.save(doc)
        dirtyRef.current = false
        setDirty(false)
        setLastSync(Date.now())
        setStatus(config.backend === 'local' ? 'local' : 'synced')
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }, 800)
    return () => window.clearTimeout(t)
  }, [doc, dirty, adapter, config.backend])

  /* ---- действия ---- */

  const key = activePerson(doc.meta.mode, person)

  const setScore = useCallback(
    (itemId: string, score: number | undefined) => {
      mutate((d) => {
        const target = activePerson(d.meta.mode, person)
        const now = Date.now()
        return {
          ...d,
          items: d.items.map((it) => {
            if (it.id !== itemId) return it
            const ratings = { ...it.ratings }
            if (score && score > 0) ratings[target] = { score, updatedAt: now }
            else delete ratings[target]
            return { ...it, ratings, updatedAt: now }
          }),
        }
      })
    },
    [mutate, person],
  )

  const addItem = useCallback(
    (data: Partial<Item>) => {
      mutate((d) => {
        const now = Date.now()
        const maxOrder = d.items.reduce((m, i) => Math.max(m, i.order), 0)
        const item = makeItem({
          ...data,
          ratings: data.ratings ?? {},
          order: maxOrder + 1000,
          orderAt: now,
          createdAt: now,
          updatedAt: now,
        })
        return { ...d, items: [...d.items, item] }
      })
    },
    [mutate],
  )

  const updateItem = useCallback(
    (itemId: string, patch: Partial<Item>) => {
      mutate((d) => ({
        ...d,
        items: d.items.map((it) =>
          it.id === itemId ? { ...it, ...patch, updatedAt: Date.now() } : it,
        ),
      }))
    },
    [mutate],
  )

  const removeItem = useCallback(
    (itemId: string) => {
      mutate((d) => ({
        ...d,
        items: d.items.map((it) =>
          it.id === itemId ? { ...it, deletedAt: Date.now(), updatedAt: Date.now() } : it,
        ),
      }))
    },
    [mutate],
  )

  /** переставить карточки внутри строки тира */
  const reorder = useCallback(
    (ids: string[]) => {
      mutate((d) => {
        const now = Date.now()
        const pos = new Map(ids.map((id, i) => [id, i * 1000]))
        return {
          ...d,
          items: d.items.map((it) =>
            pos.has(it.id) ? { ...it, order: pos.get(it.id)!, orderAt: now } : it,
          ),
        }
      })
    },
    [mutate],
  )

  const setMeta = useCallback(
    (patch: Partial<Meta>) => {
      mutate((d) => ({
        ...d,
        meta: { ...d.meta, ...patch, updatedAt: Date.now() },
      }))
    },
    [mutate],
  )

  const setMode = useCallback(
    (mode: Mode) => {
      mutate((d) => {
        const now = Date.now()
        // при переключении режима переносим оценки, чтобы список не «обнулялся»
        const items = d.items.map((it) => {
          const ratings = { ...it.ratings }
          if (d.meta.mode === 'shared' && mode === 'split') {
            if (ratings.shared?.score) {
              ratings.u1 = { score: ratings.shared.score, updatedAt: now }
            }
            delete ratings.shared
          } else if (d.meta.mode === 'split' && mode === 'shared') {
            const a = ratings.u1?.score
            const b = ratings.u2?.score
            if (a || b) {
              const avg = Math.round((((a ?? b) as number) * 2) / 2)
              ratings.shared = { score: avg, updatedAt: now }
            }
            delete ratings.u1
            delete ratings.u2
          }
          return { ...it, ratings, updatedAt: now }
        })
        return {
          ...d,
          items,
          meta: { ...d.meta, mode, updatedAt: now },
        }
      })
    },
    [mutate],
  )

  const importDoc = useCallback(
    (raw: unknown) => {
      const incoming = normalizeDoc(raw)
      mutate((d) => mergeDocs(d, incoming))
    },
    [mutate],
  )

  const resetDoc = useCallback(() => {
    mutate(() => emptyDoc())
  }, [mutate])

  const finishWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, '1')
    setWelcomed(true)
  }, [])

  return {
    doc,
    config,
    updateConfig,
    person,
    setPerson,
    key,
    mode: doc.meta.mode,
    setMode,
    status,
    error,
    lastSync,
    adapterLabel: adapter.label,
    welcomed,
    finishWelcome,
    setScore,
    addItem,
    updateItem,
    removeItem,
    reorder,
    setMeta,
    importDoc,
    resetDoc,
    dirty,
  }
}

export type TierDocApi = ReturnType<typeof useTierDoc>
