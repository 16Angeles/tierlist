import type { Doc } from '../../types'

export type SyncStatus = 'local' | 'connecting' | 'syncing' | 'synced' | 'error'

export interface SyncAdapter {
  /** Человекочитаемое имя способа подключения */
  label: string
  /** читает удалённый документ (null — данных ещё нет) */
  load(): Promise<Doc | null>
  /** записывает документ */
  save(doc: Doc): Promise<void>
  /** подписка на удалённые изменения; возвращает функцию отписки */
  subscribe?(cb: (doc: Doc | null) => void): () => void
  /** понятная ошибка для пользователя */
  message?: string
}

export interface SyncConfig {
  backend: 'local' | 'github' | 'supabase'
  /** GitHub: владелец/репозиторий/ветка/путь к файлу */
  ghOwner: string
  ghRepo: string
  ghBranch: string
  ghPath: string
  ghToken: string
  /** Supabase */
  sbUrl: string
  sbKey: string
  /** общий идентификатор списка (любой бэкенд) */
  listId: string
  /** личный ключ TMDB для поиска фильмов (не передаётся другу) */
  tmdbKey: string
}

export const DEFAULT_CONFIG: SyncConfig = {
  backend: 'local',
  ghOwner: '',
  ghRepo: '',
  ghBranch: 'main',
  ghPath: 'tierlist.json',
  ghToken: '',
  sbUrl: '',
  sbKey: '',
  listId: '',
  tmdbKey: '',
}

export function configKey(c: SyncConfig): string {
  return [
    c.backend,
    c.ghOwner,
    c.ghRepo,
    c.ghBranch,
    c.ghPath,
    c.ghToken ? 'tok' : '',
    c.sbUrl,
    c.sbKey ? 'key' : '',
    c.listId,
  ].join('|')
}

/** Настройки, которые безопасно отправлять другу (без токенов) */
export function shareableConfig(c: SyncConfig) {
  return {
    backend: c.backend,
    ghOwner: c.ghOwner,
    ghRepo: c.ghRepo,
    ghBranch: c.ghBranch,
    ghPath: c.ghPath,
    sbUrl: c.sbUrl,
    sbKey: c.sbKey,
    listId: c.listId,
  }
}
