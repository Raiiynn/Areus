import 'server-only'

import { db } from '@/lib/db'

export class RateLimitError extends Error {
  constructor(message = 'Too many attempts. Please try again later.') {
    super(message)
    this.name = 'RateLimitError'
  }
}

/** Database-backed fixed-window limiter shared by all application instances. */
export async function enforceRateLimit(params: {
  key: string
  max: number
  windowMinutes: number
}): Promise<void> {
  const now = new Date()
  const windowStart = new Date(
    now.getTime() - params.windowMinutes * 60 * 1000,
  )

  const bucket = await db.rateLimitBucket.upsert({
    where: { key: params.key },
    create: { key: params.key, count: 1, windowStart: now },
    update: { count: { increment: 1 } },
  })

  if (bucket.windowStart < windowStart) {
    await db.rateLimitBucket.update({
      where: { key: params.key },
      data: { count: 1, windowStart: now },
    })
    return
  }

  if (bucket.count > params.max) throw new RateLimitError()
}