import { formatTierRange, type TierDefinition } from '@/domain/tiers'
import { cn } from '@/lib/cn'

/**
 * Tier badge.
 *
 * The letter is always rendered. Colour reinforces it but never carries it
 * alone — FULL_BUILD §1785 and WCAG 1.4.1 both require the distinction to
 * survive without colour.
 */

const tierColor: Record<string, string> = {
  S: 'border-tier-s/50 text-tier-s bg-tier-s/10',
  A: 'border-tier-a/50 text-tier-a bg-tier-a/10',
  B: 'border-tier-b/50 text-tier-b bg-tier-b/10',
  C: 'border-tier-c/50 text-tier-c bg-tier-c/10',
  D: 'border-tier-d/50 text-tier-d bg-tier-d/10',
}

const sizes = {
  sm: 'h-5 w-5 text-2xs',
  md: 'h-7 w-7 text-sm',
  lg: 'h-10 w-10 text-xl',
} as const

export function TierBadge({
  tier,
  size = 'md',
  className,
}: {
  tier: TierDefinition | null
  size?: keyof typeof sizes
  className?: string
}) {
  if (!tier) {
    return (
      <span
        className={cn(
          'inline-grid place-items-center rounded-sm border border-line',
          'font-display text-text-muted',
          sizes[size],
          className,
        )}
        title="Unranked — no matches played yet"
      >
        <span aria-hidden="true">–</span>
        <span className="sr-only">Unranked</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-grid place-items-center rounded-sm border font-display font-semibold',
        tierColor[tier.label] ?? 'border-line text-text-secondary',
        sizes[size],
        className,
      )}
      title={`Tier ${tier.label} — ${formatTierRange(tier)}`}
    >
      <span aria-hidden="true">{tier.label}</span>
      <span className="sr-only">
        Tier {tier.label}, rating {formatTierRange(tier)}
      </span>
    </span>
  )
}
