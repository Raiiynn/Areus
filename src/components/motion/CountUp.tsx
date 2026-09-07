'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

/**
 * Counts a number up once, on entry.
 *
 * Two rules from MASTER.md shape this:
 *
 * 1. The final value is rendered on the server. The count-up only replaces the
 *    text once JS runs, so the real number is present without JavaScript and is
 *    what a crawler and a screen reader see.
 * 2. It runs once and then never moves. A number that animates while someone is
 *    reading it is, for that moment, showing a value that is not true.
 */
export function CountUp({
  value,
  duration = 0.9,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const node = ref.current
      if (!node) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const counter = { current: 0 }

        gsap.to(counter, {
          current: value,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            node.textContent = String(Math.round(counter.current))
          },
          onComplete: () => {
            // Guarantee the exact value: easing can land a fraction short.
            node.textContent = String(value)
          },
        })
      })

      return () => mm.revert()
    },
    { dependencies: [value] },
  )

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  )
}
