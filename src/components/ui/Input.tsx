'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] font-sans text-[0.9rem] outline-none transition-colors duration-200 placeholder:text-white/25 focus:border-teal',
            error && 'border-danger',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-xs text-danger">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
