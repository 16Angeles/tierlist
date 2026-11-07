import type { SyncAdapter, SyncConfig } from './types'
import { createGithubAdapter } from './github'
import { createLocalAdapter } from './local'
import { createSupabaseAdapter } from './supabase'

export function createAdapter(cfg: SyncConfig): SyncAdapter {
  switch (cfg.backend) {
    case 'github':
      if (!cfg.ghOwner || !cfg.ghRepo || !cfg.ghToken) return createLocalAdapter()
      return createGithubAdapter(cfg)
    case 'supabase':
      if (!cfg.sbUrl || !cfg.sbKey || !cfg.listId) return createLocalAdapter()
      return createSupabaseAdapter(cfg)
    default:
      return createLocalAdapter()
  }
}

export * from './types'
