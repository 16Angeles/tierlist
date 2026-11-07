import { useMemo } from 'react'
import { PlugZap } from 'lucide-react'
import type { SyncConfig } from '../lib/sync'

export function ConnectBanner({
  config,
  onOpenSettings,
}: {
  config: SyncConfig
  onOpenSettings: () => void
}) {
  const missing = useMemo(() => {
    const m: string[] = []
    if (config.backend === 'github') {
      if (!config.ghOwner || !config.ghRepo) m.push('репозиторий')
      if (!config.ghToken) m.push('токен')
      if (!config.listId) m.push('ID списка')
    } else if (config.backend === 'supabase') {
      if (!config.sbUrl) m.push('URL проекта')
      if (!config.sbKey) m.push('ключ')
      if (!config.listId) m.push('ID списка')
    }
    return m
  }, [config])

  if (!missing.length) return null

  return (
    <div className="border-b border-amber-400/20 bg-amber-400/[.07]">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:px-5">
        <PlugZap size={15} className="shrink-0 text-amber-300" />
        <span className="text-[12.5px] text-amber-100/90">
          Осталось подключить общий список — не хватает:{' '}
          <b className="text-amber-200">{missing.join(', ')}</b>
        </span>
        <button className="btn btn-ghost !border-amber-400/30 !py-1 !text-[11.5px] text-amber-100" onClick={onOpenSettings}>
          Подключить
        </button>
      </div>
    </div>
  )
}
