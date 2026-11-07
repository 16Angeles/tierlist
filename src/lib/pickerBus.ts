const listeners = new Set<() => void>()

/** Подписка на закрытие всех открытых пикеров оценки */
export function onCloseAllPickers(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Закрыть все открытые пикеры (например, при открытии нового) */
export function closeAllPickers(): void {
  for (const l of listeners) l()
}
