import type { Doc, Item, Mode, PersonId } from '../types'

export interface TierDef {
  id: string
  letter: string
  caption: string
  /** нижняя граница диапазона (включительно) */
  min: number
  /** верхняя граница для подписи (включительно) */
  max: number
  /** порог тира: оценка >= threshold попадает в этот тир */
  threshold: number
  from: string
  to: string
  glow: string
}

/** 10-балльная шкала раскладывается по 5 тиров по две оценки в каждом */
export const TIERS: TierDef[] = [
  {
    id: 'S',
    letter: 'S',
    caption: 'Шедевр',
    min: 9,
    max: 10,
    threshold: 9,
    from: '#FFE29A',
    to: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'A',
    letter: 'A',
    caption: 'Отлично',
    min: 7,
    max: 8,
    threshold: 7,
    from: '#A7F3D0',
    to: '#10B981',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'B',
    letter: 'B',
    caption: 'Хорошо',
    min: 5,
    max: 6,
    threshold: 5,
    from: '#BAE6FD',
    to: '#0EA5E9',
    glow: 'rgba(14, 165, 233, 0.4)',
  },
  {
    id: 'C',
    letter: 'C',
    caption: 'Средне',
    min: 3,
    max: 4,
    threshold: 3,
    from: '#DDD6FE',
    to: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'D',
    letter: 'D',
    caption: 'Слабо',
    min: 1,
    max: 2,
    threshold: 1,
    from: '#FECDD3',
    to: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.4)',
  },
]

export const UNRATED_ID = '?'

export function tierById(id: string): TierDef | undefined {
  return TIERS.find((t) => t.id === id)
}

/** Дробные средние (9.5, 6.5) тоже должны находить свой тир */
export function tierForScore(score: number | undefined): TierDef | undefined {
  if (score === undefined || score <= 0) return undefined
  return TIERS.find((t) => score >= t.threshold)
}

/** Итоговая оценка карточки: в общем режиме — одна оценка, в раздельном — среднее двух */
export function displayedScore(item: Item, mode: Mode): number | undefined {
  if (mode === 'shared') {
    const s = item.ratings.shared?.score
    return s ? s : undefined
  }
  const a = item.ratings.u1?.score
  const b = item.ratings.u2?.score
  if (!a && !b) return undefined
  if (a && b) return Math.round(((a + b) / 2) * 10) / 10
  return (a || b) as number
}

export function tierForItem(item: Item, mode: Mode): TierDef | undefined {
  return tierForScore(displayedScore(item, mode))
}

export function hasAnyRating(item: Item, mode: Mode): boolean {
  if (mode === 'shared') return !!item.ratings.shared?.score
  return !!(item.ratings.u1?.score || item.ratings.u2?.score)
}

export function activePerson(mode: Mode, person: PersonId): PersonId {
  return mode === 'shared' ? 'shared' : person === 'u2' ? 'u2' : 'u1'
}

/**
 * Диапазон моей оценки, при котором среднее попадёт в нужный тир.
 * null — такой тир недостижим (например, друг поставил 10, а я хочу S).
 */
export function tierTarget(
  tier: TierDef,
  item: Item,
  mode: Mode,
  person: PersonId,
): { lo: number; hi: number } | null {
  if (mode === 'shared') return { lo: tier.max, hi: tier.max }
  const other = person === 'u1' ? item.ratings.u2?.score : item.ratings.u1?.score
  if (!other) return { lo: tier.max, hi: tier.max }
  let lo = 2 * tier.min - other
  let hi = 2 * (tier.min + 1) - other - 1
  lo = Math.max(lo, 1)
  hi = Math.min(hi, 10)
  if (lo > hi) return null
  return { lo, hi }
}

/**
 * Оценка, которую нужно поставить, чтобы карточка оказалась в нужном тире.
 * Учитывает второго участника в раздельном режиме.
 */
export function scoreForTier(
  tier: TierDef,
  item: Item,
  mode: Mode,
  person: PersonId,
): number {
  const range = tierTarget(tier, item, mode, person)
  if (!range) {
    // тир недостижим — ставим максимально крайнюю оценку в его сторону
    return tier.min <= 3 ? 1 : 10
  }
  return Math.round((range.lo + range.hi) / 2)
}

export function personScore(item: Item, person: PersonId): number | undefined {
  const r = item.ratings[person]
  return r?.score ? r.score : undefined
}

/** Кто ещё оценивал (для бейджей в раздельном режиме) */
export function otherPerson(mode: Mode, person: PersonId): PersonId | undefined {
  if (mode === 'shared') return undefined
  return person === 'u1' ? 'u2' : 'u1'
}

export function peopleNames(doc: Doc): Record<PersonId, string> {
  return {
    shared: 'Общая оценка',
    u1: doc.meta.people.u1 || 'Участник 1',
    u2: doc.meta.people.u2 || 'Участник 2',
  }
}
