import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <motion.div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className={`glass-strong relative z-10 my-auto w-full ${maxWidth} overflow-hidden rounded-3xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[.07] px-6 py-5">
              <div className="min-w-0">
                <div className="font-display text-[26px] leading-none tracking-wide text-white">{title}</div>
                {subtitle && <div className="mt-1.5 text-[13px] text-white/45">{subtitle}</div>}
              </div>
              <button className="btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scroll-thin">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-white/[.07] bg-black/20 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
