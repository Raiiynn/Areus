import { cn } from '@/lib/cn'

/**
 * A rating, in display type with tabular figures.
 *
 * Tabular figures matter here specifically: without them digits have different
 * widths, so a column of ratings visibly jitters as values change.
 */

const sizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
} as const

export function RatingValue({
  value,
  size = 'md',
  className,
}: {
  value: number | null
  size?: keyof typeof sizes
  className?: string
}) {
  if (value === null) {
    return (
      <span className={cn('tnum text-text-muted', sizes[size], className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">No rating yet</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'tnum font-display font-semibold text-text-primary',
        sizes[size],
        className,
      )}
    >
      {value}
    </span>
  )
}

/**
 * A signed rating change.
 *
 * Carries three independent signals — arrow glyph, sign, and colour — so the
 * direction survives greyscale and colour-blindness.
 */
export function RatingDelta({
  delta,
  className,
}: {
  delta: number
  className?: string
}) {
  const positive = delta > 0
  const neutral = delta === 0

  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-0.5 text-sm font-medium',
        neutral ? 'text-text-muted' : positive ? 'text-positive' : 'text-negative',
        className,
      )}
    >
      <span aria-hidden="true">{neutral ? '·' : positive ? '▲' : '▼'}</span>
      <span>
        {positive ? '+' : ''}
        {delta}
      </span>
      <span className="sr-only">
        {neutral ? 'no change' : positive ? 'rating gained' : 'rating lost'}
      </span>
    </span>
  )
}
