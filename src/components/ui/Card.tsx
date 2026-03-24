'use client'

import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gradient' | 'streak' | 'membership'
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-surface border border-border',
    gradient: 'bg-gradient-to-br from-surface to-surface2 border border-border',
    streak: 'bg-gradient-to-br from-teal/[0.12] to-lime/[0.06] border border-teal/25',
    membership: 'bg-gradient-to-br from-surface to-surface2 border border-border relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-teal before:to-lime',
  }

  return (
    <div className={cn('rounded-2xl p-5', variants[variant], className)}>
      {children}
    </div>
  )
}
