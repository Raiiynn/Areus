import Image from 'next/image'

import { cn } from '@/lib/cn'

/**
 * The AREUS lockup.
 *
 * One asset, `public/areus-logo.png`: the whole artwork — wings, sword and the
 * wordmark baked into the blade — trimmed to its ink so the surrounding layout
 * controls the spacing rather than the exporter's transparent margin.
 *
 * It is never cropped. An earlier revision cut the emblem out above the
 * wordmark to get a wider mark for the header, which sliced the blade in half;
 * the artwork reads as one shape and any crop truncates it. Where the logo has
 * to be small, it is scaled down whole and paired with live text instead.
 *
 * Sizing note: `tailwind.config.ts` *replaces* the spacing scale rather than
 * extending it, so only the ramp values exist — 1, 2, 3, 4, 5, 6, 8, 10, 12,
 * 16, 20, 24. `h-9` is not among them, and Tailwind silently emits nothing for
 * a class it cannot resolve, which leaves the image at its intrinsic 681×701.
 * Every size below is a real ramp step.
 */

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string
  markClassName?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src="/areus-logo.png"
        alt=""
        aria-hidden="true"
        width={681}
        height={701}
        priority
        className={cn('h-8 w-auto', markClassName)}
      />
      {/* The artwork's own wordmark is only a few pixels tall at this size, so
          the brand name is set in live text beside it — selectable, and read
          once rather than twice by a screen reader. */}
      {showWordmark ? (
        <span className="font-display text-xl font-semibold tracking-widest">
          AREUS
        </span>
      ) : (
        <span className="sr-only">AREUS</span>
      )}
    </span>
  )
}

/**
 * The logo on its own, decorative. Used beside text that already names the
 * brand, so it carries no alt text — repeating "AREUS" to a screen reader next
 * to a heading that says AREUS is noise, not information.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/areus-logo.png"
      alt=""
      aria-hidden="true"
      width={681}
      height={701}
      priority
      className={cn('h-auto w-full', className)}
    />
  )
}

/**
 * Full lockup with an accessible name, for places where the mark is the
 * subject rather than an accompaniment.
 */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <Image
      src="/areus-logo.png"
      alt="AREUS"
      width={681}
      height={701}
      priority
      className={cn('h-auto w-full', className)}
    />
  )
}
