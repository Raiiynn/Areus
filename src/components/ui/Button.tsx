import { forwardRef, type ButtonHTMLAttributes } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/cn'

/**
 * Button — five states, always (MASTER.md).
 *
 * `accent` is the brand periwinkle from the logo's blade, reserved for the one
 * ladder-advancing action on a screen. There is deliberately no gold variant:
 * `--gold` marks achievement, not actions, and spending it on a button would
 * cost the one colour that means "rank" — the drift MASTER.md's accent rule
 * exists to prevent.
 */

type Variant = 'primary' | 'accent' | 'ghost' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md border ' +
  'transition-colors duration-instant ease-out select-none ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const variants: Record<Variant, string> = {
  primary:
    'bg-text-primary text-text-inverse border-transparent hover:bg-white active:bg-text-secondary',
  accent:
    'bg-accent text-text-inverse border-transparent hover:bg-accent-strong active:bg-accent',
  ghost:
    'bg-transparent text-text-primary border-line hover:border-line-strong hover:bg-surface-overlay active:bg-surface-raised',
  danger:
    'bg-transparent text-negative border-negative/40 hover:bg-negative/10 hover:border-negative active:bg-negative/20',
  quiet:
    'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-overlay',
}

/* Minimum 44px height on md and lg: touch targets must be comfortable
   (FULL_BUILD §523). sm is for dense table rows only, where a larger target
   would break the row rhythm — it is never the only way to reach an action. */
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'ghost', size = 'md', className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  },
)

export function ButtonLink({
  variant = 'ghost',
  size = 'md',
  className,
  href,
  children,
  ...props
}: {
  variant?: Variant
  size?: Size
  className?: string
  href: string
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  )
}
