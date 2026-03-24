'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'teal' | 'lime' | 'yellow' | 'danger' | 'warn' | 'default'
  className?: string
}

export function Badge({ children, variant = 'teal', className }: BadgeProps) {
  const variants = {
    teal: 'bg-teal/15 text-teal border-teal/25',
    lime: 'bg-lime/[0.12] text-lime border-lime/20',
    yellow: 'bg-yellow/15 text-yellow-bright border-yellow/25',
    danger: 'bg-danger/15 text-[#ff8080] border-danger/25',
    warn: 'bg-warning/15 text-[#ffaa50] border-warning/25',
    default: 'bg-white/5 text-muted border-border',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6rem] font-bold tracking-[0.1em] uppercase border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
