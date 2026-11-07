export type ToastTone = 'ok' | 'err' | 'info'

export interface ToastItem {
  id: number
  text: string
  tone: ToastTone
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
let seq = 1

function emit() {
  for (const l of listeners) l()
}

export function toast(text: string, tone: ToastTone = 'ok') {
  const id = seq++
  items = [...items, { id, text, tone }]
  emit()
  window.setTimeout(() => dismissToast(id), 3200)
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function getToasts() {
  return items
}

export function subscribeToasts(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
