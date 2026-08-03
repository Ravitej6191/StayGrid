import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Fab({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'fixed right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/35 ring-1 ring-white/20 transition-transform duration-200 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 active:scale-90',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
