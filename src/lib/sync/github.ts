import type { Doc } from '../../types'
import { normalizeDoc } from '../doc'
import { fromBase64, toBase64 } from '../utils'
import type { SyncAdapter, SyncConfig } from './types'

const API = 'https://api.github.com'

/**
 * GitHub как база: файл tierlist.json в репозитории.
 * Читаем через Contents API, пишем тем же API. ETag позволяет опрашивать
 * репозиторий часто — 304-ответы не тратят лимит GitHub.
 */
export function createGithubAdapter(cfg: SyncConfig): SyncAdapter {
  const { ghOwner, ghRepo, ghBranch, ghPath, ghToken } = cfg
  let etag: string | null = null
  let sha: string | null = null

  const url = `${API}/repos/${ghOwner}/${ghRepo}/contents/${encodeURIComponent(ghPath)}?ref=${encodeURIComponent(ghBranch)}`

  const headers = (extra: Record<string, string> = {}) => ({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${ghToken}`,
    ...extra,
  })

  async function read(): Promise<Doc | null> {
    const res = await fetch(url, {
      headers: headers(etag ? { 'If-None-Match': etag } : {}),
    })
    if (res.status === 304) return null
    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.message ?? `HTTP ${res.status}`
      throw new Error(`GitHub: ${msg}`)
    }
    const et = res.headers.get('etag')
    if (et) etag = et
    const json = await res.json()
    sha = json.sha ?? null
    if (!json.content) return null
    const text = json.encoding === 'base64' ? fromBase64(json.content) : json.content
    return normalizeDoc(JSON.parse(text))
  }

  async function write(doc: Doc): Promise<void> {
    const content = toBase64(JSON.stringify(doc, null, 2))
    const payload: Record<string, unknown> = {
      message: `chore: update tierlist (${doc.items.length} items)`,
      content,
      branch: ghBranch,
    }
    if (sha) payload.sha = sha

    let res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) })
    if (res.status === 409 || res.status === 422) {
      // файл успели изменить — перечитываем и повторяем
      etag = null
      await read()
      if (sha) payload.sha = sha
      res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) })
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(`GitHub: ${body?.message ?? `HTTP ${res.status}`}`)
    }
    const json = await res.json().catch(() => null)
    if (json?.sha) sha = json.sha
    if (json?.content?.sha) sha = json.content.sha
    const et = res.headers.get('etag')
    if (et) etag = et
  }

  return {
    label: `GitHub · ${ghOwner}/${ghRepo}`,
    load: read,
    save: write,
    subscribe(cb) {
      let stopped = false
      const tick = async () => {
        if (stopped) return
        if (document.visibilityState === 'visible') {
          try {
            const doc = await read()
            if (doc) cb(doc)
          } catch {
            /* тихо игнорируем сетевые сбои в фоне */
          }
        }
      }
      const timer = window.setInterval(tick, 5000)
      const onVis = () => {
        if (document.visibilityState === 'visible') tick()
      }
      document.addEventListener('visibilitychange', onVis)
      return () => {
        stopped = true
        window.clearInterval(timer)
        document.removeEventListener('visibilitychange', onVis)
      }
    },
  }
}
