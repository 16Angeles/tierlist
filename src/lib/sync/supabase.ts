import { normalizeDoc } from '../doc'
import type { SyncAdapter, SyncConfig } from './types'

/**
 * Supabase: реальное время, без ручного опроса.
 * Нужна таблица tierlist_docs (id text primary key, doc jsonb, updated_at timestamptz).
 * Клиент грузится лениво — чтобы не тянуть ~500 КБ, пока он не нужен.
 */
export function createSupabaseAdapter(cfg: SyncConfig): SyncAdapter {
  type Client = {
    from: (t: string) => any
    channel: (n: string) => any
    removeChannel: (c: any) => void
  }

  let clientPromise: Promise<Client> | null = null
  const getClient = (): Promise<Client> => {
    if (!clientPromise) {
      clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(cfg.sbUrl, cfg.sbKey, {
          auth: { persistSession: false },
          global: { headers: { 'x-tiers-list': cfg.listId } },
        }) as unknown as Client,
      )
    }
    return clientPromise
  }

  return {
    label: 'Supabase',
    async load() {
      const client = await getClient()
      const { data, error } = await client
        .from('tierlist_docs')
        .select('doc')
        .eq('id', cfg.listId)
        .maybeSingle()
      if (error) throw new Error(`Supabase: ${error.message}`)
      if (!data?.doc) return null
      return normalizeDoc(data.doc)
    },
    async save(doc) {
      const client = await getClient()
      const { error } = await client.from('tierlist_docs').upsert({
        id: cfg.listId,
        doc,
        updated_at: new Date().toISOString(),
      })
      if (error) throw new Error(`Supabase: ${error.message}`)
    },
    subscribe(cb) {
      let cleanup: (() => void) | null = null
      let cancelled = false
      ;(async () => {
        const client = await getClient()
        if (cancelled) return
        const channel = client
          .channel(`tiers:${cfg.listId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tierlist_docs',
              filter: `id=eq.${cfg.listId}`,
            },
            (payload: any) => {
              const next = payload?.new?.doc ?? payload?.old?.doc
              if (next) cb(normalizeDoc(next))
            },
          )
          .subscribe()
        cleanup = () => client.removeChannel(channel)
      })()
      return () => {
        cancelled = true
        cleanup?.()
      }
    },
  }
}
