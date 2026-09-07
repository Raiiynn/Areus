import { cn } from '@/lib/cn'

/**
 * Gamemode marker.
 *
 * The accent comes from the gamemode row themeToken, so adding a gamemode needs
 * no component change (FULL_BUILD §1108).
 */
export function GamemodeBadge({
  name,
  themeToken,
  className,
}: {
  name: string
  themeToken: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-line',
        'bg-surface-overlay px-2 py-px text-2xs font-medium uppercase tracking-wider',
        'text-text-secondary',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: `var(--${themeToken}, var(--mode-default))` }}
      />
      {name}
    </span>
  )
}

/** Win/loss marker: glyph, letter and colour — three signals, not one. */
export function WinLossPill({ won }: { won: boolean }) {
  return (
    <span
      className={cn(
        'inline-grid h-5 w-5 place-items-center rounded-sm border text-2xs font-bold',
        won
          ? 'border-positive/40 bg-positive/10 text-positive'
          : 'border-negative/40 bg-negative/10 text-negative',
      )}
    >
      <span aria-hidden="true">{won ? 'W' : 'L'}</span>
      <span className="sr-only">{won ? 'Win' : 'Loss'}</span>
    </span>
  )
}
