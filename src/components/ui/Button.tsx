'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'teal' | 'yellow' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  isLoading?: boolean
  /** Required for icon-only buttons for accessibility */
  'aria-label'?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'teal', size = 'md', fullWidth, isLoading, children, disabled, 'aria-label': ariaLabel, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
    
    const variants = {
      teal: 'bg-teal text-black shadow-[3px_3px_0_#2e7a74] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#2e7a74] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#2e7a74]',
      yellow: 'bg-yellow-bright text-black shadow-[3px_3px_0_#a07010] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#a07010]',
      outline: 'bg-transparent text-teal border border-teal hover:bg-teal/[0.08]',
      ghost: 'bg-transparent text-muted border border-white/10 hover:text-white hover:border-white/25',
      danger: 'bg-danger text-white hover:bg-danger/90',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    }

    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Chargement...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
