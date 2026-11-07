import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { dismissToast, getToasts, subscribeToasts } from '../lib/toast'

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={() => dismissToast(t.id)}
            className="glass-strong pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-medium shadow-2xl"
          >
            {t.tone === 'ok' && <CheckCircle2 size={16} className="text-emerald-400" />}
            {t.tone === 'err' && <XCircle size={16} className="text-rose-400" />}
            {t.tone === 'info' && <Info size={16} className="text-sky-400" />}
            <span className="text-white/85">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
