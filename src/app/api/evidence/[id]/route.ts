import { NextResponse } from 'next/server'

import { AuthorizationError, requireAuth } from '@/lib/auth/authorization'
import { isStaff } from '@/lib/auth/roles'
import { readEvidence } from '@/lib/evidence'
import { db } from '@/lib/db'

/**
 * Serves a match evidence screenshot.
 *
 * Evidence is not public (FULL_BUILD §1574). Files live outside the web root
 * and are streamed only to people entitled to see them:
 *
 * - the two players in the match, and
 * - staff, who need it to review.
 *
 * Anyone else gets 404 rather than 403 — telling an unauthorized caller that a
 * particular evidence id exists is itself a disclosure.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let user
  try {
    user = await requireAuth()
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  const evidence = await db.matchEvidence.findUnique({
    where: { id },
    include: {
      match: { select: { submitterId: true, opponentId: true } },
    },
  })

  if (!evidence) return new NextResponse('Not found', { status: 404 })

  const participant =
    evidence.match.submitterId === user.id ||
    evidence.match.opponentId === user.id

  if (!participant && !isStaff(user)) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const buffer = await readEvidence(evidence.storagePath)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': evidence.mimeType,
        'Content-Length': String(buffer.byteLength),
        // Private: evidence must not sit in a shared cache where the next
        // viewer might not be entitled to it.
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
        // Belt and braces: even if the type check were bypassed, the browser
        // must not sniff this into something executable.
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new NextResponse('Not found', { status: 404 })
    }
    // A row pointing at a file that is gone is a server fault, not a 404 for
    // the user to interpret.
    console.error('Failed to read evidence', evidence.id)
    return new NextResponse('Evidence unavailable', { status: 500 })
  }
}
