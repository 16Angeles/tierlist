import type { Doc } from '../../types'
import { normalizeDoc } from '../doc'
import type { SyncAdapter } from './types'

const KEY = 'tiers.doc.v1'

export function readLocalDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return normalizeDoc(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeLocalDoc(doc: Doc) {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc))
  } catch {
    /* переполнение квоты — молча игнорируем */
  }
}

export function createLocalAdapter(): SyncAdapter {
  return {
    label: 'Только на этом устройстве',
    async load() {
      return readLocalDoc()
    },
    async save(doc) {
      writeLocalDoc(doc)
    },
  }
}
