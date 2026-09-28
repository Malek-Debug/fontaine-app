'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null)

function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => removeToast(id), 5000)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Container & Item                                                   */
/* ------------------------------------------------------------------ */

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle; bg: string; border: string; text: string }
> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-success-50',
    border: 'border-success-500',
    text: 'text-success-700',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-danger-50',
    border: 'border-danger-500',
    text: 'text-danger-700',
  },
  info: {
    icon: Info,
    bg: 'bg-primary-50',
    border: 'border-primary-500',
    text: 'text-primary-700',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-50',
    border: 'border-warning-500',
    text: 'text-warning-700',
  },
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 start-4 end-4 z-50 flex flex-col gap-2 sm:start-auto sm:end-4 sm:w-96"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const config = typeConfig[toast.type]
        const Icon = config.icon
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border-s-4 p-4 shadow-lg',
              config.bg,
              config.border
            )}
            role="alert"
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.text)} />
            <p className={cn('text-sm font-medium flex-1', config.text)}>
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export { ToastProvider, useToast, type ToastType, type Toast }
