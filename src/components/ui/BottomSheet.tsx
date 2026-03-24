'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[5000] flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-surface rounded-t-3xl p-7 pb-10 animate-slide-up max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />
        <h2 className="font-display text-[1.6rem] tracking-[0.06em] mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
