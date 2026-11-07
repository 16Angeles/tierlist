import type { FactorId, Factors, Rating, Weights } from '../types'
import { FACTORS } from '../types'
import { snapScore } from './tiers'

export const FACTOR_MIN = 1
export const FACTOR_MAX = 10
export const FACTOR_STEP = 0.5

export const DEFAULT_FACTORS: Factors = {
  plot: 5,
  fun: 5,
  music: 5,
  atmosphere: 5,
  rewatch: 5,
}

export const DEFAULT_WEIGHTS: Weights = {
  plot: 1,
  fun: 1,
  music: 1,
  atmosphere: 1,
  rewatch: 1,
}

export function clampFactor(v: number): number {
  const snapped = Math.round(v / FACTOR_STEP) * FACTOR_STEP
  return Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, Math.round(snapped * 100) / 100))
}

/** веса: неотрицательные, сумма > 0; иначе — равные */
export function normalizeWeights(w?: Partial<Weights> | null): Weights {
  const out: Weights = { ...DEFAULT_WEIGHTS }
  if (w) {
    for (const f of FACTORS) {
      const v = Number(w[f.id])
      if (Number.isFinite(v) && v >= 0) out[f.id] = Math.min(5, Math.round(v * 100) / 100)
    }
  }
  const sum = FACTORS.reduce((a, f) => a + out[f.id], 0)
  if (sum <= 0) return { ...DEFAULT_WEIGHTS }
  return out
}

/** веса в процентах — для показа в интерфейсе */
export function weightPercents(w?: Partial<Weights> | null): Record<FactorId, number> {
  const nw = normalizeWeights(w)
  const sum = FACTORS.reduce((a, f) => a + nw[f.id], 0)
  const out = {} as Record<FactorId, number>
  for (const f of FACTORS) out[f.id] = Math.round((nw[f.id] / sum) * 100)
  return out
}

/** приводит набор факторов к валидному виду; null — если хотя бы один фактор сломан */
export function sanitizeFactors(raw: Partial<Factors> | null | undefined): Factors | null {
  if (!raw) return null
  const out = {} as Factors
  for (const f of FACTORS) {
    const v = Number(raw[f.id])
    if (!Number.isFinite(v)) return null
    out[f.id] = clampFactor(v)
  }
  return out
}

/** взвешенное среднее по 5 факторам — это и есть итоговая оценка */
export function factorsScore(f: Factors, w?: Partial<Weights> | null): number {
  const nw = normalizeWeights(w)
  let num = 0
  let den = 0
  for (const meta of FACTORS) {
    const v = Number(f[meta.id])
    if (!Number.isFinite(v)) continue
    num += nw[meta.id] * v
    den += nw[meta.id]
  }
  if (!den) return 0
  return snapScore(num / den)
}

/** факторы из оценки; null — если детализации нет */
export function ratingFactors(r?: Rating): Factors | null {
  return r ? sanitizeFactors(r.factors) : null
}

/**
 * Пропорционально подгоняет факторы под нужную оценку
 * (например, при перетаскивании карточки в тир).
 */
export function scaleFactors(
  f: Factors,
  target: number,
  w?: Partial<Weights> | null,
): Factors {
  const nw = normalizeWeights(w)
  let cur = factorsScore(f, nw)
  if (!cur) return f
  let out: Factors = { ...f }
  for (let i = 0; i < 8; i++) {
    const k = target / cur
    const next = {} as Factors
    for (const meta of FACTORS) next[meta.id] = clampFactor(out[meta.id] * k)
    const s = factorsScore(next, nw)
    if (JSON.stringify(next) === JSON.stringify(out)) break
    out = next
    cur = s
    if (Math.abs(s - target) < 0.05) break
  }
  return out
}
