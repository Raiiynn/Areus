import { cn } from '@/lib/cn'

export function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
  className,
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  tone?: 'neutral' | 'accent' | 'warning'
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-surface-raised px-4 py-3',
        tone === 'accent'
          ? 'border-accent/40'
          : tone === 'warning'
            ? 'border-warning/40'
            : 'border-line',
        className,
      )}
    >
      <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          'tnum mt-1 font-display text-2xl font-semibold',
          tone === 'accent'
            ? 'text-accent'
            : tone === 'warning'
              ? 'text-warning'
              : 'text-text-primary',
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-xs text-text-secondary">{detail}</p> : null}
    </div>
  )
}
