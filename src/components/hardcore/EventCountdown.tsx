'use client'

import { useEffect, useState } from 'react'

/** Counts toward a published event schedule, never a player ban. */
export function EventCountdown({ startsAt }: { startsAt: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])
  if (now === null) return <span>Countdown loading…</span>
  const remaining = new Date(startsAt).getTime() - now
  if (!Number.isFinite(remaining)) return <span>Schedule unavailable</span>
  if (remaining <= 0)
    return <span>Scheduled start reached · check event status</span>
  const minutes = Math.ceil(remaining / 60_000)
  return (
    <span>
      {Math.floor(minutes / 1440)}d {Math.floor(minutes / 60) % 24}h{' '}
      {minutes % 60}m until scheduled start
    </span>
  )
}
