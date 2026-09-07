import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth/authorization'
import { computeLiveVersion } from '@/services/live'

/**
 * Change-detection endpoint for the client poller.
 *
 * A thin shell over `computeLiveVersion` — the logic lives in the service so
 * the test suite, which drives services directly, can cover it.
 *
 * No ETag/304 handling: it would save a couple of hundred bytes while still
 * running both aggregates, which is the actual cost. The response is per-viewer
 * and must never be cached by anything in between, hence `no-store`.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let user
  try {
    user = await requireAuth()
  } catch {
    // Signed out is a normal state for this endpoint, not an error: the poller
    // simply stops. 401 rather than the 404 used elsewhere, because nothing is
    // being disclosed here — there is no resource whose existence is a secret.
    return new NextResponse('unauthenticated', { status: 401 })
  }

  const version = await computeLiveVersion(user)

  return NextResponse.json(
    { v: version },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
