'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/**
 * One staggered entrance per section (MASTER.md interaction thesis).
 *
 * Rules this implements:
 * - Only `transform` and `opacity` animate — never layout properties.
 * - `useGSAP` with a scope, so selectors cannot reach outside this component
 *   and every tween and ScrollTrigger is reverted on unmount.
 * - Reduced motion is handled through `gsap.matchMedia`, which reverts cleanly
 *   when the preference changes mid-session.
 * - Children start visible in the DOM and are only hidden once GSAP is running,
 *   so a failed or blocked script leaves readable content rather than a blank
 *   page.
 */
export function Reveal({
  children,
  stagger = 0.04,
  y = 12,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  stagger?: number
  y?: number
  delay?: number
  className?: string
}) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal-item]')
      if (targets.length === 0) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduced } = context.conditions as {
            motion: boolean
            reduced: boolean
          }

          if (reduced) {
            // Final state immediately. The information is never withheld.
            gsap.set(targets, { opacity: 1, y: 0 })
            return
          }

          gsap.set(targets, { opacity: 0, y })

          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            delay,
            stagger,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: scope.current,
              // Fires a little before the section is fully in view, so the
              // reveal has finished by the time the reader reaches it.
              start: 'top 85%',
              once: true,
            },
          })
        },
      )

      return () => mm.revert()
    },
    { scope },
  )

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  )
}

/** Marks a direct child as part of the parent Reveal sequence. */
export function RevealItem({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'li' | 'section' | 'article'
}) {
  return (
    <Tag data-reveal-item className={className}>
      {children}
    </Tag>
  )
}
