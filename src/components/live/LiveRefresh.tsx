'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Re-renders the page when something the viewer can see has changed.
 *
 * Decisions can now arrive from outside this browser — an admin approving from
 * Discord — so a page that only updates on its own mutations would keep showing
 * a queue item somebody already handled.
 *
 * `router.refresh()` re-fetches the RSC payload while preserving client state,
 * so the `useActionState` forms in the admin queue are not clobbered mid-edit.
 *
 * Three deliberate restraints:
 *
 * - Nothing polls while the tab is hidden. A backgrounded admin tab would
 *   otherwise keep two database aggregates running all day for nobody.
 * - A failed request backs off progressively instead of hammering. If the
 *   server is struggling, a poller retrying every 10s per open tab is the last
 *   thing it needs.
 * - Renders nothing. This is behaviour, not UI — there is no spinner and no
 *   "updated" toast, because content that moves under a reader is the thing
 *   MASTER.md's motion rules exist to prevent.
 */

const INTERVAL_MS = 10_000
const MAX_BACKOFF_MS = 120_000

export function LiveRefresh() {
  const router = useRouter()
  // Refs, not state: changing these must never itself cause a render.
  const version = useRef<string | null>(null)
  const backoff = useRef(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      if (document.visibilityState !== 'visible') return schedule()

      try {
        const response = await fetch('/api/live/version', {
          cache: 'no-store',
        })

        if (!response.ok) {
          // 401 means signed out. Stop entirely rather than back off — there is
          // nothing to wait for, and the next navigation re-mounts this.
          if (response.status === 401) return
          backoff.current = Math.min(
            backoff.current === 0 ? INTERVAL_MS : backoff.current * 2,
            MAX_BACKOFF_MS,
          )
          return schedule()
        }

        backoff.current = 0
        const { v } = (await response.json()) as { v: string }

        // The first reading establishes a baseline. Refreshing on it would mean
        // every mount triggers a pointless round trip.
        if (version.current !== null && version.current !== v) {
          router.refresh()
        }
        version.current = v
      } catch {
        // Offline or aborted. Treated exactly like a server error.
        backoff.current = Math.min(
          backoff.current === 0 ? INTERVAL_MS : backoff.current * 2,
          MAX_BACKOFF_MS,
        )
      }

      schedule()
    }

    function schedule() {
      if (cancelled) return
      timer = setTimeout(poll, backoff.current || INTERVAL_MS)
    }

    // Coming back to the tab should feel immediate, not wait out the interval.
    function onVisible() {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        void poll()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    schedule()

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  return null
}
