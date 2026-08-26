'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium text-white/80">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-elite-dark/50 border border-elite-border rounded-lg text-white placeholder-white/30',
            'focus:outline-none focus:ring-2 focus:ring-elite-primary/50 focus:border-elite-primary/50 transition-all',
            error && 'border-red-500/50 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
