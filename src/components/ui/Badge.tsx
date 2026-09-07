import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warning' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'border-line text-text-secondary bg-surface-overlay',
  accent: 'border-accent/40 text-accent bg-accent-dim',
  positive: 'border-positive/40 text-positive bg-positive/10',
  negative: 'border-negative/40 text-negative bg-negative/10',
  warning: 'border-warning/40 text-warning bg-warning/10',
  info: 'border-info/40 text-info bg-info/10',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-px',
        'text-2xs font-medium uppercase tracking-wider',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
