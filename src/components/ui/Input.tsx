'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** Helper text shown below the input */
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const inputId = providedId || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const hasError = Boolean(error)
    const hasHelper = Boolean(helperText)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] font-sans text-[0.9rem] outline-none transition-colors duration-200 placeholder:text-white/25 focus:border-teal focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            hasError && 'border-danger focus:border-danger focus-visible:ring-danger',
            className
          )}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={cn(
            hasError && errorId,
            hasHelper && helperId
          ) || undefined}
          {...props}
        />
        {error && (
          <span 
            id={errorId}
            role="alert"
            className="text-xs text-danger"
          >
            {error}
          </span>
        )}
        {helperText && !error && (
          <span 
            id={helperId}
            className="text-xs text-muted"
          >
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
