import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './toastContext.js'

const toneConfig = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100',
  },
  error: {
    icon: XCircle,
    className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-100',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100',
  },
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50 text-senai-blue dark:border-blue-300/20 dark:bg-blue-400/10 dark:text-blue-100',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, tone = 'info', duration = 4200 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((current) => [...current, { id, title, description, tone }])
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-24 z-[80] grid w-[calc(100%-32px)] max-w-sm gap-3">
        <AnimatePresence>
          {toasts.map((item) => {
            const config = toneConfig[item.tone] || toneConfig.info
            const Icon = config.icon
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                className={`pointer-events-auto rounded-2xl border p-4 shadow-elevated backdrop-blur-xl ${config.className}`}
              >
                <div className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <strong className="block text-sm font-bold">{item.title}</strong>
                    {item.description && (
                      <p className="mt-1 text-sm leading-5 opacity-80">{item.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
