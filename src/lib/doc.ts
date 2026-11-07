import type { Doc, Item, Meta, PersonId } from '../types'
import { uid } from './utils'
import { DEFAULT_WEIGHTS, factorsScore, normalizeWeights, sanitizeFactors } from './factors'

export const DOC_VERSION = 1

export function emptyDoc(): Doc {
  const now = Date.now()
  return {
    v: DOC_VERSION,
    updatedAt: now,
    meta: {
      name: 'Наш тирлист',
      mode: 'shared',
      people: { u1: 'Я', u2: 'Друг' },
      weights: { ...DEFAULT_WEIGHTS },
      updatedAt: now,
    },
    items: [],
  }
}

export function makeItem(partial: Partial<Item>): Item {
  const now = Date.now()
  return {
    id: uid(),
    title: 'Без названия',
    kind: 'movie',
    ratings: {},
    order: 0,
    orderAt: now,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

/** Мягкое слияние двух версий документа: побеждает более свежая запись по каждому полю */
export function mergeItem(local: Item, remote: Item): Item {
  const ratings: Item['ratings'] = { ...local.ratings }
  for (const key of Object.keys(remote.ratings) as PersonId[]) {
    const a = ratings[key]
    const b = remote.ratings[key]
    if (!a || (b && b.updatedAt > a.updatedAt)) ratings[key] = b
  }

  const remoteIsNewer = remote.updatedAt > local.updatedAt
  const merged: Item = {
    ...(remoteIsNewer ? remote : local),
    ratings,
    order: (remote.orderAt ?? 0) > (local.orderAt ?? 0) ? remote.order : local.order,
    orderAt: Math.max(local.orderAt ?? 0, remote.orderAt ?? 0),
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  }

  const deletedAt = Math.max(local.deletedAt ?? 0, remote.deletedAt ?? 0)
  if (deletedAt) merged.deletedAt = deletedAt
  else delete merged.deletedAt

  return merged
}

/**
 * Пересчитывает оценки, посчитанные по факторам (например, после смены весов).
 * Оценка без факторов не трогается.
 */
export function refreshFactorScores(d: Doc): Doc {
  const weights = normalizeWeights(d.meta.weights)
  let changed = false
  const items = d.items.map((it) => {
    const ratings: Item['ratings'] = { ...it.ratings }
    let itemChanged = false
    for (const key of Object.keys(ratings) as PersonId[]) {
      const r = ratings[key]
      if (!r) continue
      const f = sanitizeFactors(r.factors)
      if (!f) continue
      const score = factorsScore(f, weights)
      if (Math.abs(r.score - score) > 0.001) {
        ratings[key] = { ...r, score, factors: f }
        itemChanged = true
      } else if (!r.factors) {
        ratings[key] = { ...r, factors: f }
        itemChanged = true
      }
    }
    if (!itemChanged) return it
    changed = true
    return { ...it, ratings, updatedAt: Date.now() }
  })
  return changed ? { ...d, items } : d
}

export function mergeMeta(local: Meta, remote: Meta): Meta {
  return (remote.updatedAt ?? 0) > (local.updatedAt ?? 0) ? remote : local
}

export function mergeDocs(local: Doc, remote: Doc): Doc {
  const map = new Map<string, Item>()
  for (const it of local.items) map.set(it.id, it)
  for (const it of remote.items) {
    const mine = map.get(it.id)
    map.set(it.id, mine ? mergeItem(mine, it) : it)
  }
  const items = [...map.values()].filter((i) => !i.deletedAt)
  items.sort((a, b) => a.createdAt - b.createdAt)
  return {
    v: DOC_VERSION,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    meta: mergeMeta(local.meta, remote.meta),
    items,
  }
}

/** Сравнение без учёта служебных полей — чтобы понять, нужно ли перезаписать удалённую копию */
export function docsEqual(a: Doc, b: Doc): boolean {
  const norm = (d: Doc) =>
    JSON.stringify({
      meta: { ...d.meta, updatedAt: 0 },
      items: [...d.items]
        .sort((x, y) => x.id.localeCompare(y.id))
        .map((i) => ({ ...i, updatedAt: 0, orderAt: 0, ratings: undefined })),
    })
  return norm(a) === norm(b)
}

/** чистит оценки: убирает битые факторы */
function sanitizeRatings(ratings: Item['ratings'] | undefined): Item['ratings'] {
  if (!ratings || typeof ratings !== 'object') return {}
  const out: Item['ratings'] = {}
  for (const key of Object.keys(ratings) as PersonId[]) {
    const r = ratings[key]
    if (!r || typeof r !== 'object') continue
    const score = Number(r.score)
    if (!Number.isFinite(score)) continue
    const f = sanitizeFactors(r.factors)
    out[key] = f ? { score, factors: f, updatedAt: Number(r.updatedAt) || Date.now() } : { score, updatedAt: Number(r.updatedAt) || Date.now() }
  }
  return out
}

export function normalizeDoc(raw: unknown): Doc {
  const base = emptyDoc()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Doc>
  const items: Item[] = Array.isArray(r.items)
    ? r.items
        .filter((i) => i && typeof i === 'object' && 'id' in i)
        .map((i) => {
          const it = i as Item
          return {
            ...it,
            ratings: sanitizeRatings(it.ratings),
            order: Number(it.order) || 0,
            orderAt: Number(it.orderAt) || Date.now(),
            createdAt: Number(it.createdAt) || Date.now(),
            updatedAt: Number(it.updatedAt) || Date.now(),
          }
        })
    : []
  return {
    v: DOC_VERSION,
    updatedAt: Number(r.updatedAt) || Date.now(),
    meta: {
      ...base.meta,
      ...(r.meta ?? {}),
      people: { ...base.meta.people, ...(r.meta?.people ?? {}) },
      weights: normalizeWeights(r.meta?.weights),
      updatedAt: Number(r.meta?.updatedAt) || Date.now(),
    },
    items,
  }
}
