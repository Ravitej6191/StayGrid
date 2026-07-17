import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Fab({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'fixed right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
