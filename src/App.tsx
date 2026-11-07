import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { toPng } from 'html-to-image'
import { useTierDoc } from './state/useTierDoc'
import { useTierDnd } from './state/useTierDnd'
import { TopBar } from './components/TopBar'
import { TierBoard } from './components/TierBoard'
import { UnratedTray } from './components/UnratedTray'
import { StatsPanel } from './components/StatsPanel'
import { AddItemModal } from './components/AddItemModal'
import { SettingsModal } from './components/SettingsModal'
import { WelcomeModal } from './components/WelcomeModal'
import { Toaster } from './components/Toaster'
import { ConnectBanner } from './components/ConnectBanner'
import { PosterGhost } from './components/PosterCard'
import { peopleNames, tierForItem } from './lib/tiers'
import { copyText } from './lib/utils'
import { toast } from './lib/toast'
import type { Item } from './types'

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")"

export default function App() {
  const api = useTierDoc()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  const dnd = useTierDnd({
    doc: api.doc,
    person: api.person,
    setScore: api.setScore,
    reorder: api.reorder,
  })

  const names = useMemo(() => peopleNames(api.doc), [api.doc])

  const allItems = useMemo(
    () => api.doc.items.filter((i) => !i.deletedAt),
    [api.doc.items],
  )

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.year ? String(i.year).includes(q) : false) ||
        (i.note ?? '').toLowerCase().includes(q),
    )
  }, [allItems, query])

  const unrated = useMemo(
    () => items.filter((i) => !tierForItem(i, api.mode)),
    [items, api.mode],
  )

  /* ---- горячая клавиша: N — добавить фильм ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'n' || e.key === 'N' || e.key === '+') {
        e.preventDefault()
        setAddOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openAdd = useCallback(() => {
    setEditing(null)
    setAddOpen(true)
  }, [])

  const openEdit = useCallback((item: Item) => {
    setEditing(item)
    setAddOpen(true)
  }, [])

  const inviteLink = useMemo(() => {
    const c = api.config
    const params = new URLSearchParams()
    params.set('backend', c.backend)
    if (c.backend === 'github' && c.ghOwner && c.ghRepo) {
      params.set('gh', `${c.ghOwner}/${c.ghRepo}`)
      params.set('branch', c.ghBranch)
      params.set('path', c.ghPath)
    }
    if (c.backend === 'supabase') {
      if (c.sbUrl) params.set('sb', c.sbUrl)
    }
    params.set('list', c.listId || 'our-list')
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`
  }, [api.config])

  const share = useCallback(async () => {
    const ok = await copyText(inviteLink)
    toast(
      ok ? 'Ссылка-приглашение скопирована' : 'Не удалось скопировать ссылку',
      ok ? 'ok' : 'err',
    )
  }, [inviteLink])

  const exportPng = useCallback(async () => {
    const node = boardRef.current
    if (!node) return
    setExporting(true)
    document.body.classList.add('exporting')
    try {
      await new Promise((r) => setTimeout(r, 150))
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#05060a',
        cacheBust: true,
        filter: (el) =>
          !(el instanceof HTMLElement && el.dataset.noExport !== undefined),
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${(api.doc.meta.name || 'tierlist').replace(/[^\wа-яё\- ]/gi, '')}.png`
      a.click()
      toast('PNG сохранён')
    } catch {
      toast('Не удалось сохранить PNG', 'err')
    } finally {
      document.body.classList.remove('exporting')
      setExporting(false)
    }
  }, [api.doc.meta.name])

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={dnd.collisionDetection}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDragEnd={dnd.onDragEnd}
      onDragCancel={dnd.onDragCancel}
    >
      {/* атмосфера */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-52 h-[560px] w-[560px] animate-drift rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="absolute -right-40 top-1/4 h-[520px] w-[520px] animate-drift-slow rounded-full bg-amber-500/[.14] blur-[140px]" />
        <div className="absolute -bottom-52 left-1/3 h-[480px] w-[480px] animate-drift rounded-full bg-sky-600/[.12] blur-[140px]" />
        <div className="absolute inset-0 opacity-[.03] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {dnd.activeItem ? (
          <PosterGhost
            item={dnd.activeItem}
            mode={api.mode}
            person={api.person}
            names={names}
          />
        ) : null}
      </DragOverlay>

      <TopBar
        mode={api.mode}
        onMode={api.setMode}
        person={api.person}
        onPerson={api.setPerson}
        personNames={api.doc.meta.people}
        status={api.status}
        error={api.error}
        lastSync={api.lastSync}
        adapterLabel={api.adapterLabel}
        query={query}
        onQuery={setQuery}
        onOpenSettings={() => setSettingsOpen(true)}
        onAdd={openAdd}
      />

      <ConnectBanner config={api.config} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto max-w-[1720px] px-3 pb-16 pt-4 sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div
            ref={boardRef}
            className="min-w-0 rounded-2xl bg-[radial-gradient(120%_70%_at_12%_0%,rgba(124,58,237,0.16),transparent_62%),radial-gradient(90%_60%_at_92%_4%,rgba(245,158,11,0.10),transparent_60%)]"
          >
            <TierBoard
              items={items}
              mode={api.mode}
              person={api.person}
              names={names}
              onScore={api.setScore}
              onOpen={openEdit}
              listName={api.doc.meta.name}
              onExportPng={exportPng}
              onShare={share}
              exporting={exporting}
              draggingItem={dnd.activeItem}
            />
          </div>

          <aside className="space-y-4">
            <StatsPanel items={allItems} mode={api.mode} person={api.person} names={names} />
            <UnratedTray
              items={unrated}
              mode={api.mode}
              person={api.person}
              names={names}
              onScore={api.setScore}
              onOpen={openEdit}
              onAdd={openAdd}
            />
          </aside>
        </div>
      </main>

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(data) => {
          api.addItem(data)
          toast(`«${data.title}» добавлен`)
        }}
        onUpdate={(id, patch) => {
          api.updateItem(id, patch)
          toast('Сохранено')
        }}
        onDelete={(id) => {
          api.removeItem(id)
          toast('Удалено', 'info')
        }}
        editing={editing}
        tmdbKey={api.config.tmdbKey}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={api.config}
        updateConfig={api.updateConfig}
        doc={api.doc}
        setMeta={api.setMeta}
        setMode={api.setMode}
        importDoc={api.importDoc}
        resetDoc={api.resetDoc}
      />

      <WelcomeModal
        open={!api.welcomed}
        onClose={() => api.finishWelcome()}
        onStart={({ name, u1, u2, mode }) => {
          api.setMeta({ name, people: { u1, u2 } })
          api.setMode(mode)
          api.finishWelcome()
        }}
        defaultName={api.doc.meta.name}
        defaultU1={api.doc.meta.people.u1}
        defaultU2={api.doc.meta.people.u2}
      />

      <Toaster />
    </DndContext>
  )
}
