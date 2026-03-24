'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'milestone' | 'default'
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const typeStyles = {
    success: 'border-success text-success',
    error: 'border-danger text-danger',
    milestone: 'border-teal text-teal',
    default: 'border-border text-white',
  }

  return (
    <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 z-[8000] flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'bg-surface border rounded-[14px] px-5 py-3 text-[0.82rem] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fade-up whitespace-nowrap',
            typeStyles[toast.type]
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
