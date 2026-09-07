import { NextResponse } from 'next/server'

import { discordConfig, isDiscordConfigured } from '@/lib/discord/config'
import { verifyDiscordSignature } from '@/lib/discord/verify'
import {
  handleDiscordInteraction,
  type DiscordInteraction,
} from '@/services/discordInteractions'

/**
 * Discord interactions endpoint.
 *
 * Deliberately thin: verify, parse, delegate. All of the decision logic lives
 * in `services/discordInteractions` where the test suite can reach it — this
 * file exists only to do the two things a service cannot, namely read the raw
 * request bytes and set an HTTP status.
 *
 * Two departures from the conventions of `api/evidence/[id]/route.ts`, both
 * forced by Discord:
 *
 * - **An invalid signature must be 401, not 404.** Discord validates a new
 *   endpoint URL by sending a deliberately bad signature and requiring a 401;
 *   answering 404 — the non-disclosure default everywhere else in this app —
 *   fails validation and the URL cannot be saved.
 * - Bodies are JSON rather than plain text, because Discord parses them.
 */

// node:crypto and Prisma both need the Node runtime, not Edge.
export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Read the raw bytes exactly once. Calling request.json() first would consume
  // the body and leave nothing to verify — and re-serialising a parsed object
  // would not reproduce the bytes Discord signed.
  const rawBody = Buffer.from(await request.arrayBuffer())

  const verified = verifyDiscordSignature({
    rawBody,
    signature: request.headers.get('x-signature-ed25519'),
    timestamp: request.headers.get('x-signature-timestamp'),
    publicKeyHex: discordConfig.publicKey,
  })

  if (!verified) {
    return new NextResponse('invalid request signature', { status: 401 })
  }

  // Configuration is checked after verification, never before: an unconfigured
  // deployment has an empty public key, so nothing can verify anyway, and
  // answering differently would let an unauthenticated caller probe whether
  // the integration is switched on.
  if (!isDiscordConfigured()) {
    return new NextResponse('not configured', { status: 503 })
  }

  let interaction: DiscordInteraction
  try {
    interaction = JSON.parse(rawBody.toString('utf8')) as DiscordInteraction
  } catch {
    return new NextResponse('malformed body', { status: 400 })
  }

  try {
    return NextResponse.json(await handleDiscordInteraction(interaction))
  } catch (error) {
    // The handler maps its own expected failures to ephemeral replies, so
    // reaching here means something genuinely unforeseen. Log it, and tell
    // Discord nothing.
    console.error('Discord interaction handler threw', error)
    return new NextResponse('interaction failed', { status: 500 })
  }
}
