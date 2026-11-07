import { useCallback, useMemo, useState } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Doc, Item, PersonId } from '../types'
import { UNRATED_ID, scoreForTier, tierById, tierForItem, tierTarget } from '../lib/tiers'

export const ROW_PREFIX = 'row:'

export function containerOf(item: Item, mode: Doc['meta']['mode']): string {
  return tierForItem(item, mode)?.id ?? UNRATED_ID
}

export function useTierDnd(opts: {
  doc: Doc
  person: PersonId
  setScore: (itemId: string, score: number | undefined) => void
  reorder: (ids: string[]) => void
}) {
  const { doc, person, setScore, reorder } = opts
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const collisionDetection: CollisionDetection = useMemo(
    () => (args) => {
      const pointer = pointerWithin(args)
      if (pointer.length > 0) return pointer
      return closestCenter(args)
    },
    [],
  )

  const liveItems = useMemo(() => doc.items.filter((i) => !i.deletedAt), [doc.items])

  const resolveContainer = useCallback(
    (overId: string): string | null => {
      if (overId.startsWith(ROW_PREFIX)) return overId.slice(ROW_PREFIX.length)
      const it = liveItems.find((i) => i.id === overId)
      return it ? containerOf(it, doc.meta.mode) : null
    },
    [liveItems, doc.meta.mode],
  )

  const idsIn = useCallback(
    (container: string, exclude?: string) =>
      liveItems
        .filter((i) => i.id !== exclude && containerOf(i, doc.meta.mode) === container)
        .sort((a, b) => a.order - b.order)
        .map((i) => i.id),
    [liveItems, doc.meta.mode],
  )

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const onDragOver = useCallback(
    (e: DragOverEvent) => {
      const { active, over } = e
      if (!over) return
      const draggingId = String(active.id)
      const dragging = liveItems.find((i) => i.id === draggingId)
      if (!dragging) return

      const target = resolveContainer(String(over.id))
      if (!target) return

      const current = containerOf(dragging, doc.meta.mode)
      if (target === current) return

      if (target === UNRATED_ID) {
        setScore(draggingId, undefined)
        return
      }

      const tier = tierById(target)
      if (!tier) return
      // недостижимый тир (например, друг поставил 10, а мы хотим S) — не дёргаем карточку на лету
      if (!tierTarget(tier, dragging, doc.meta.mode, person)) return
      const score = scoreForTier(tier, dragging, doc.meta.mode, person)
      setScore(draggingId, score)

      const ids = idsIn(target, draggingId)
      ids.push(draggingId)
      reorder(ids)
    },
    [liveItems, resolveContainer, setScore, reorder, idsIn, doc.meta.mode, person],
  )

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e
      setActiveId(null)
      if (!over) return
      const draggingId = String(active.id)
      const overId = String(over.id)
      if (draggingId === overId) return

      const container = resolveContainer(overId)
      if (!container) return

      const dragging = liveItems.find((i) => i.id === draggingId)
      if (!dragging) return
      const current = containerOf(dragging, doc.meta.mode)

      // карточка не доехала до нужного тира — фиксируем оценку при отпускании
      if (container !== current) {
        if (container === UNRATED_ID) {
          setScore(draggingId, undefined)
          return
        }
        const tier = tierById(container)
        if (tier) {
          setScore(draggingId, scoreForTier(tier, dragging, doc.meta.mode, person))
          const moved = idsIn(container, draggingId)
          moved.push(draggingId)
          reorder(moved)
        }
        return
      }

      const ids = idsIn(container)
      const from = ids.indexOf(draggingId)
      const to = ids.indexOf(overId)
      if (from === -1 || to === -1) return
      ids.splice(to, 0, ids.splice(from, 1)[0])
      reorder(ids)
    },
    [resolveContainer, idsIn, reorder, liveItems, setScore, doc.meta.mode, person],
  )

  const activeItem = activeId ? (liveItems.find((i) => i.id === activeId) ?? null) : null

  return {
    sensors,
    collisionDetection,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel: () => setActiveId(null),
    activeItem,
  }
}
