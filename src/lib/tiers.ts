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
  /** верхняя граница диапазона (не включительно) — для расчётов */
  bandHi: number
  /** как показывать диапазон в подписи */
  label: string
  /** оценка, которая ставится при перетаскивании в тир (общий режим) */
  dropScore: number
  from: string
  to: string
  glow: string
}

/** 10-балльная шкала с дробными оценками: S 9–10, A 7–8.9, B 5–6.9, C 3–4.9, D 1–2.9 */
export const TIERS: TierDef[] = [
  {
    id: 'S',
    letter: 'S',
    caption: 'Шедевр',
    min: 9,
    max: 10,
    threshold: 9,
    bandHi: 10.5,
    label: '9–10',
    dropScore: 10,
    from: '#FFE29A',
    to: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'A',
    letter: 'A',
    caption: 'Отлично',
    min: 7,
    max: 8.9,
    threshold: 7,
    bandHi: 9,
    label: '7–8.9',
    dropScore: 8,
    from: '#A7F3D0',
    to: '#10B981',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'B',
    letter: 'B',
    caption: 'Хорошо',
    min: 5,
    max: 6.9,
    threshold: 5,
    bandHi: 7,
    label: '5–6.9',
    dropScore: 6,
    from: '#BAE6FD',
    to: '#0EA5E9',
    glow: 'rgba(14, 165, 233, 0.4)',
  },
  {
    id: 'C',
    letter: 'C',
    caption: 'Средне',
    min: 3,
    max: 4.9,
    threshold: 3,
    bandHi: 5,
    label: '3–4.9',
    dropScore: 4,
    from: '#DDD6FE',
    to: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'D',
    letter: 'D',
    caption: 'Слабо',
    min: 1,
    max: 2.9,
    threshold: 1,
    bandHi: 3,
    label: '1–2.9',
    dropScore: 2,
    from: '#FECDD3',
    to: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.4)',
  },
]

export const UNRATED_ID = '?'

/** шаг шкалы: оценки можно ставить с точностью до 0.1 */
export const SCORE_STEP = 0.1
export const SCORE_MIN = 1
export const SCORE_MAX = 10

export function snapScore(n: number): number {
  const snapped = Math.round(n / SCORE_STEP) * SCORE_STEP
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(snapped * 10) / 10))
}

export function tierById(id: string): TierDef | undefined {
  return TIERS.find((t) => t.id === id)
}

/** Дробные средние (9.5, 8.75) тоже должны находить свой тир */
export function tierForScore(score: number | undefined): TierDef | undefined {
  if (score === undefined || score <= 0) return undefined
  return TIERS.find((t) => score >= t.threshold)
}

/** Среднее без округления — по нему определяется тир */
export function rawScore(item: Item, mode: Mode): number | undefined {
  if (mode === 'shared') {
    const s = item.ratings.shared?.score
    return s ? s : undefined
  }
  const a = item.ratings.u1?.score
  const b = item.ratings.u2?.score
  if (!a && !b) return undefined
  if (a && b) return (a + b) / 2
  return (a || b) as number
}

/** Оценка для отображения (до 2 знаков) */
export function displayedScore(item: Item, mode: Mode): number | undefined {
  const raw = rawScore(item, mode)
  if (raw === undefined) return undefined
  return Math.round(raw * 100) / 100
}

export function tierForItem(item: Item, mode: Mode): TierDef | undefined {
  return tierForScore(rawScore(item, mode))
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
  if (mode === 'shared') return { lo: tier.dropScore, hi: tier.dropScore }
  const other = person === 'u1' ? item.ratings.u2?.score : item.ratings.u1?.score
  if (!other) return { lo: tier.dropScore, hi: tier.dropScore }
  // среднее в [min, bandHi)  =>  s в [2*min - other, 2*bandHi - other)
  const inv = 1 / SCORE_STEP
  let lo = 2 * tier.min - other
  let hi = 2 * tier.bandHi - other
  // округляем к шагу шкалы: lo — вверх, hi — вниз (граница сверху не включается)
  lo = Math.ceil(lo * inv - 1e-9) / inv
  hi = Math.floor((hi - 1e-9) * inv + 1e-9) / inv
  lo = Math.max(lo, SCORE_MIN)
  hi = Math.min(hi, SCORE_MAX)
  if (lo > hi) return null
  return { lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10 }
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
    return tier.min <= 3 ? SCORE_MIN : SCORE_MAX
  }
  return snapScore((range.lo + range.hi) / 2)
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
