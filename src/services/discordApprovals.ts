import 'server-only'

import { Prisma } from '@prisma/client'

import {
  DISCORD_APPROVAL_KINDS,
  type DiscordApprovalKind,
} from '@/domain/constants'
import { db } from '@/lib/db'
import { discordConfig, isDiscordConfigured } from '@/lib/discord/config'
import {
  buildMatchCard,
  buildPlayerCard,
  buildResolvedMatchCard,
  buildResolvedPlayerCard,
  type MatchCardInput,
  type PlayerCardInput,
  type Resolution,
  type ResolutionRequest,
} from '@/lib/discord/messages'
import { createMessage, editMessage } from '@/lib/discord/rest'
import { getHeadToHead } from '@/services/players'

/**
 * Mirrors the approval queues into a Discord channel.
 *
 * Two invariants govern everything here:
 *
 * 1. **Discord can never fail an approval.** Every function swallows its own
 *    errors and logs them. These are called from inside the service choke
 *    points, and a Discord outage must not roll back a decision that already
 *    committed, nor stop one from being made.
 * 2. **The card is a projection, never a source of truth.** It is rendered from
 *    a fresh read every time, and if an edit is lost the buttons simply stay —
 *    which is safe, because the next click fails the service's atomic claim and
 *    re-renders the card from current state.
 *
 * Deliberate non-goal: there is no outbox or retry queue. A Discord outage
 * means a missed card; the web queue is unaffected and remains authoritative.
 * An outbox is the textbook answer and would be real work — it is not worth it
 * for a channel mirror whose failure mode is "open the site instead".
 */

function report(context: string, error: unknown): void {
  console.error(
    `Discord approval ${context} failed:`,
    error instanceof Error ? error.message : error,
  )
}

/**
 * Claims the right to publish this target, exactly once.
 *
 * The row is written *before* the message is posted. Posting first would let
 * two concurrent publishers each create a card, and the loser's insert would
 * then collide — leaving a live-button message with no row behind it, which the
 * resolver could never clear. A unique-constraint violation here means someone
 * else owns this target, so we return and post nothing.
 */
async function claim(
  kind: DiscordApprovalKind,
  targetId: string,
): Promise<boolean> {
  try {
    await db.discordApproval.create({
      data: { kind, targetId, channelId: discordConfig.channelId },
    })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return false
    }
    throw error
  }
}

async function post(
  kind: DiscordApprovalKind,
  targetId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const messageId = await createMessage(discordConfig.channelId, body)

  await db.discordApproval.update({
    where: { kind_targetId: { kind, targetId } },
    data: { messageId },
  })
}

// ---------------------------------------------------------------------------
// Card inputs, read fresh from the database
// ---------------------------------------------------------------------------

async function loadPlayerCard(userId: string): Promise<PlayerCardInput | null> {
  const player = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      minecraftUsername: true,
      createdAt: true,
    },
  })

  return player
}

async function loadMatchCard(matchId: string): Promise<MatchCardInput | null> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      gamemode: { select: { name: true } },
      submitter: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
      evidence: { select: { id: true } },
    },
  })

  if (!match) return null

  const headToHead = await getHeadToHead(match.submitter.id, match.opponent.id)

  return {
    id: match.id,
    gamemodeName: match.gamemode.name,
    submitterUsername: match.submitter.username,
    opponentUsername: match.opponent.username,
    submitterScore: match.submitterScore,
    opponentScore: match.opponentScore,
    winnerIsSubmitter: match.winnerId === match.submitter.id,
    headToHead,
    suspicious: match.suspicious,
    suspicionReasons: match.suspicionReasons,
    notes: match.notes,
    opponentConfirmedAt: match.opponentConfirmedAt,
    hasEvidence: match.evidence.length > 0,
    createdAt: match.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export async function publishPlayerApproval(userId: string): Promise<void> {
  if (!isDiscordConfigured()) return

  try {
    const player = await loadPlayerCard(userId)
    if (!player) return
    if (!(await claim(DISCORD_APPROVAL_KINDS.PLAYER, userId))) return

    await post(
      DISCORD_APPROVAL_KINDS.PLAYER,
      userId,
      buildPlayerCard(player) as unknown as Record<string, unknown>,
    )
  } catch (error) {
    report(`publish player ${userId}`, error)
  }
}

export async function publishMatchApproval(matchId: string): Promise<void> {
  if (!isDiscordConfigured()) return

  try {
    const match = await loadMatchCard(matchId)
    if (!match) return
    if (!(await claim(DISCORD_APPROVAL_KINDS.MATCH, matchId))) return

    await post(
      DISCORD_APPROVAL_KINDS.MATCH,
      matchId,
      buildMatchCard(match) as unknown as Record<string, unknown>,
    )
  } catch (error) {
    report(`publish match ${matchId}`, error)
  }
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

/**
 * Turns an actor id into the display name the card shows.
 *
 * Only ever called past the configured gate, so a deployment with no Discord
 * pays nothing for it. Falls back rather than throwing: by this point the
 * decision has already committed, and a card reading "An administrator" is a
 * cosmetic loss, not a correctness one.
 */
async function resolutionFor(request: ResolutionRequest): Promise<Resolution> {
  const actor = await db.user.findUnique({
    where: { id: request.decidedById },
    select: { username: true },
  })

  return {
    approved: request.approved,
    decidedBy: actor?.username ?? 'An administrator',
    reason: request.reason ?? null,
  }
}

async function resolvable(kind: DiscordApprovalKind, targetId: string) {
  const row = await db.discordApproval.findUnique({
    where: { kind_targetId: { kind, targetId } },
  })

  // No row means the card was never published; a null messageId means a crash
  // between the claim and the post. Neither is an error — there is simply
  // nothing to edit.
  if (!row?.messageId) return null
  return row
}

/**
 * Rewrites a decided card: outcome recorded, buttons removed.
 *
 * `resolvedAt` is bookkeeping only. It deliberately does **not** gate anything:
 * the authority over whether a decision may still happen is the atomic claim
 * inside `reviewPlayer`/`reviewMatch`, and duplicating that authority here
 * would create a second, weaker gate that could disagree with the first.
 */
export async function resolvePlayerApproval(
  userId: string,
  request: ResolutionRequest,
): Promise<void> {
  if (!isDiscordConfigured()) return

  try {
    const row = await resolvable(DISCORD_APPROVAL_KINDS.PLAYER, userId)
    if (!row?.messageId) return

    const player = await loadPlayerCard(userId)
    if (!player) return

    await editMessage(
      row.channelId,
      row.messageId,
      buildResolvedPlayerCard(
        player,
        await resolutionFor(request),
      ) as unknown as Record<string, unknown>,
    )

    await db.discordApproval.update({
      where: { id: row.id },
      data: { resolvedAt: new Date() },
    })
  } catch (error) {
    report(`resolve player ${userId}`, error)
  }
}

export async function resolveMatchApproval(
  matchId: string,
  request: ResolutionRequest,
): Promise<void> {
  if (!isDiscordConfigured()) return

  try {
    const row = await resolvable(DISCORD_APPROVAL_KINDS.MATCH, matchId)
    if (!row?.messageId) return

    const match = await loadMatchCard(matchId)
    if (!match) return

    await editMessage(
      row.channelId,
      row.messageId,
      buildResolvedMatchCard(
        match,
        await resolutionFor(request),
      ) as unknown as Record<string, unknown>,
    )

    await db.discordApproval.update({
      where: { id: row.id },
      data: { resolvedAt: new Date() },
    })
  } catch (error) {
    report(`resolve match ${matchId}`, error)
  }
}
