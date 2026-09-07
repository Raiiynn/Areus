import 'server-only'

import type { Prisma } from '@prisma/client'

import {
  AUDIT_ACTIONS,
  MATCH_STATUSES,
  NOTIFICATION_TYPES,
  OPPONENT_CONFIRMATION_WINDOW_HOURS,
  STARTING_RATING,
  SUSPICION_RULES,
  USER_STATUSES,
} from '@/domain/constants'
import { ratingEngine } from '@/domain/rating/elo'
import { db } from '@/lib/db'
import { recordAudit } from '@/services/audit'
import {
  publishMatchApproval,
  resolveMatchApproval,
} from '@/services/discordApprovals'
import { notify, notifyMany } from '@/services/notifications'

/**
 * Match lifecycle (FULL_BUILD §37, §38, §39, §51).
 *
 *   submit -> PENDING_OPPONENT -> PENDING_ADMIN -> APPROVED -> ratings applied
 *                    |                   |            |
 *                 disputed           rejected     rejected
 *
 * Rating changes happen at exactly one point: admin approval, inside a
 * transaction. No other path in the codebase writes to PlayerGamemodeRating.
 */

/** Statuses from which a match can still change. */
const OPEN_STATUSES = [
  MATCH_STATUSES.PENDING_OPPONENT,
  MATCH_STATUSES.PENDING_ADMIN,
] as const

/** Raised for rule violations the player should see and can act on. */
export class MatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatchError'
  }
}

export interface SubmitMatchParams {
  submitterId: string
  opponentUsername: string
  gamemodeSlug: string
  submitterScore: number
  opponentScore: number
  notes?: string
  evidence: {
    storagePath: string
    mimeType: string
    byteSize: number
    detectedType: string
    sha256: string
  }
}

/**
 * Heuristics that flag a submission for closer human attention.
 *
 * These never block and never punish (FULL_BUILD §1486) — they set a flag the
 * reviewer sees. A false positive costs a moment of an admin's time; a missed
 * signal costs the ladder's integrity.
 */
async function detectSuspicion(params: {
  submitterId: string
  opponentId: string
  submitterScore: number
  opponentScore: number
  evidenceSha256: string
}): Promise<string[]> {
  const reasons: string[] = []
  const now = Date.now()

  const windowStart = new Date(
    now - SUSPICION_RULES.SUBMISSION_WINDOW_MINUTES * 60 * 1000,
  )
  const recentCount = await db.match.count({
    where: { submitterId: params.submitterId, createdAt: { gte: windowStart } },
  })
  if (recentCount >= SUSPICION_RULES.MAX_SUBMISSIONS_PER_WINDOW) {
    reasons.push(
      `${recentCount} submissions in the last ${SUSPICION_RULES.SUBMISSION_WINDOW_MINUTES} minutes`,
    )
  }

  const dayStart = new Date(now - 24 * 60 * 60 * 1000)
  const sameOpponentCount = await db.match.count({
    where: {
      submitterId: params.submitterId,
      opponentId: params.opponentId,
      createdAt: { gte: dayStart },
    },
  })
  if (sameOpponentCount >= SUSPICION_RULES.MAX_SAME_OPPONENT_PER_DAY) {
    reasons.push(`${sameOpponentCount} matches against the same opponent today`)
  }

  const gap = Math.abs(params.submitterScore - params.opponentScore)
  if (gap >= SUSPICION_RULES.IMPLAUSIBLE_SCORE_GAP) {
    reasons.push(`Unusually wide score gap (${gap})`)
  }

  // The same screenshot submitted twice is the cheapest form of fabrication.
  const reusedEvidence = await db.matchEvidence.count({
    where: { sha256: params.evidenceSha256 },
  })
  if (reusedEvidence > 0) {
    reasons.push('Screenshot has been submitted before')
  }

  return reasons
}

export async function submitMatch(params: SubmitMatchParams) {
  const gamemode = await db.gamemode.findUnique({
    where: { slug: params.gamemodeSlug },
  })
  if (!gamemode || !gamemode.active) {
    throw new MatchError('That gamemode is not available.')
  }

  const opponent = await db.user.findUnique({
    where: { usernameNormalized: params.opponentUsername.toLowerCase() },
  })
  if (!opponent) {
    throw new MatchError('No player with that username exists.')
  }
  if (opponent.id === params.submitterId) {
    throw new MatchError('You cannot submit a match against yourself.')
  }
  if (opponent.status !== USER_STATUSES.APPROVED) {
    throw new MatchError('That player is not an approved competitor.')
  }

  // Duplicate guard: the same pairing, gamemode and scores already awaiting a
  // decision almost certainly means a double-submit.
  const duplicate = await db.match.findFirst({
    where: {
      submitterId: params.submitterId,
      opponentId: opponent.id,
      gamemodeId: gamemode.id,
      submitterScore: params.submitterScore,
      opponentScore: params.opponentScore,
      status: { in: [...OPEN_STATUSES] },
    },
  })
  if (duplicate) {
    throw new MatchError(
      'You already have an identical match awaiting review.',
    )
  }

  const suspicionReasons = await detectSuspicion({
    submitterId: params.submitterId,
    opponentId: opponent.id,
    submitterScore: params.submitterScore,
    opponentScore: params.opponentScore,
    evidenceSha256: params.evidence.sha256,
  })

  const winnerId =
    params.submitterScore > params.opponentScore ? params.submitterId : opponent.id

  const escalatesAt = new Date(
    Date.now() + OPPONENT_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000,
  )

  const match = await db.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        gamemodeId: gamemode.id,
        submitterId: params.submitterId,
        opponentId: opponent.id,
        submitterScore: params.submitterScore,
        opponentScore: params.opponentScore,
        winnerId,
        status: MATCH_STATUSES.PENDING_OPPONENT,
        notes: params.notes?.trim() || null,
        escalatesAt,
        suspicious: suspicionReasons.length > 0,
        suspicionReasons: suspicionReasons.length
          ? suspicionReasons.join('; ')
          : null,
        evidence: { create: params.evidence },
      },
    })

    await notify(
      {
        userId: opponent.id,
        type: NOTIFICATION_TYPES.MATCH_AWAITING_CONFIRMATION,
        title: 'A match needs your confirmation',
        body: `A ${gamemode.name} match was submitted naming you as the opponent. Confirm or dispute it.`,
        href: `/matches/${created.id}`,
      },
      tx,
    )

    return created
  })

  return match
}

/**
 * Opponent confirms or disputes (FULL_BUILD §38).
 *
 * Only the named opponent may act, and only while the match is still awaiting
 * them — both checked here rather than assumed from the UI.
 */
export async function respondToMatch(params: {
  matchId: string
  opponentId: string
  decision: 'CONFIRM' | 'DISPUTE'
  reason?: string
}) {
  const match = await db.match.findUnique({
    where: { id: params.matchId },
    include: { gamemode: true },
  })
  if (!match) throw new MatchError('That match no longer exists.')

  if (match.opponentId !== params.opponentId) {
    throw new MatchError('You are not the opponent in this match.')
  }
  if (match.status !== MATCH_STATUSES.PENDING_OPPONENT) {
    throw new MatchError('This match is no longer awaiting your response.')
  }

  const confirming = params.decision === 'CONFIRM'

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.match.update({
      where: { id: match.id },
      data: confirming
        ? {
            status: MATCH_STATUSES.PENDING_ADMIN,
            opponentConfirmedAt: new Date(),
          }
        : {
            status: MATCH_STATUSES.REJECTED,
            opponentRejectedAt: new Date(),
            opponentRejectReason: params.reason?.trim() || null,
          },
    })

    await notify(
      {
        userId: match.submitterId,
        type: confirming
          ? NOTIFICATION_TYPES.MATCH_OPPONENT_CONFIRMED
          : NOTIFICATION_TYPES.MATCH_OPPONENT_REJECTED,
        title: confirming
          ? 'Your opponent confirmed the match'
          : 'Your opponent disputed the match',
        body: confirming
          ? `Your ${match.gamemode.name} match is now waiting for an administrator.`
          : `Your ${match.gamemode.name} match was disputed and will not affect ratings.`,
        href: `/matches/${match.id}`,
      },
      tx,
    )

    return updated
  })

  // Post-commit, best-effort: confirming is what puts the match in front of an
  // admin, so it is the moment the Discord card is worth posting. A dispute
  // ends the match instead, and never reaches a queue.
  if (confirming) {
    await publishMatchApproval(match.id)
  }

  return result
}

/**
 * Escalate matches whose confirmation window has lapsed (FULL_BUILD §1222).
 *
 * An unresponsive opponent must not be able to bury a legitimate result, so the
 * match moves to admin review rather than expiring.
 */
export async function escalateOverdueMatches(): Promise<number> {
  const overdue = await db.match.findMany({
    where: {
      status: MATCH_STATUSES.PENDING_OPPONENT,
      escalatesAt: { lte: new Date() },
    },
    select: { id: true },
  })
  if (overdue.length === 0) return 0

  await db.match.updateMany({
    where: { id: { in: overdue.map((m) => m.id) } },
    data: { status: MATCH_STATUSES.PENDING_ADMIN },
  })

  // An escalated match reaches the admin queue exactly like a confirmed one,
  // so it earns a card too. Sequential rather than concurrent: this is a
  // background sweep with no one waiting on it, and Discord rate-limits.
  for (const match of overdue) {
    await publishMatchApproval(match.id)
  }

  return overdue.length
}

/**
 * Admin decision (FULL_BUILD §39, §51).
 *
 * Approval is the only place ratings change, and it is transactional:
 * verify -> compute -> append history -> update ratings -> mark approved ->
 * notify -> audit. Any failure rolls the whole thing back, so an approved match
 * with a missing rating update (§1547) cannot occur.
 */
export async function reviewMatch(params: {
  matchId: string
  reviewerId: string
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
  reason?: string
}) {
  const match = await db.match.findUnique({
    where: { id: params.matchId },
    include: { gamemode: true },
  })
  if (!match) throw new MatchError('That match no longer exists.')
  if (match.status !== MATCH_STATUSES.PENDING_ADMIN) {
    throw new MatchError('This match is not awaiting review.')
  }

  if (params.decision === 'REQUEST_INFO') {
    return db.$transaction(async (tx) => {
      // Stays in the review queue; the players are asked for more detail.
      await notifyMany(
        [match.submitterId, match.opponentId].map((userId) => ({
          userId,
          type: NOTIFICATION_TYPES.MATCH_INFO_REQUESTED,
          title: 'More information needed',
          body: params.reason?.trim() || 'An administrator needs more detail about this match.',
          href: `/matches/${match.id}`,
        })),
        tx,
      )
      return match
    })
  }

  if (params.decision === 'REJECT') {
    const rejected = await db.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id: match.id },
        data: {
          status: MATCH_STATUSES.REJECTED,
          reviewedById: params.reviewerId,
          reviewedAt: new Date(),
          reviewReason: params.reason?.trim() || null,
        },
      })

      await notifyMany(
        [match.submitterId, match.opponentId].map((userId) => ({
          userId,
          type: NOTIFICATION_TYPES.MATCH_REJECTED,
          title: 'Match rejected',
          body: params.reason?.trim() || 'An administrator rejected this match.',
          href: `/matches/${match.id}`,
        })),
        tx,
      )

      await recordAudit(
        {
          actorId: params.reviewerId,
          action: AUDIT_ACTIONS.ADMIN_REJECTED_MATCH,
          targetType: 'Match',
          targetId: match.id,
          metadata: { reason: params.reason ?? null },
        },
        tx,
      )

      return updated
    })

    await resolveMatchApproval(match.id, {
      approved: false,
      decidedById: params.reviewerId,
      reason: params.reason ?? null,
    })

    return rejected
  }

  // APPROVE
  const winnerId = match.winnerId
  if (!winnerId) throw new MatchError('This match has no recorded winner.')
  const loserId =
    winnerId === match.submitterId ? match.opponentId : match.submitterId

  const approved = await db.$transaction(async (tx) => {
    // Claim the match atomically: the expected status travels in the WHERE
    // clause, so exactly one caller can see count === 1. Two admins hitting
    // approve at the same moment would otherwise both apply the rating change,
    // and rating history is append-only — the inflation would be permanent.
    //
    // Re-reading the status here would not be sufficient under row-level
    // concurrency. This conditional update is the atomic claim.
    const claimed = await tx.match.updateMany({
      where: { id: match.id, status: MATCH_STATUSES.PENDING_ADMIN },
      data: {
        status: MATCH_STATUSES.APPROVED,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
        reviewReason: params.reason?.trim() || null,
      },
    })
    if (claimed.count === 0) {
      throw new MatchError('This match has already been reviewed.')
    }

    const [winnerRating, loserRating] = await Promise.all([
      ensureRating(tx, winnerId, match.gamemodeId),
      ensureRating(tx, loserId, match.gamemodeId),
    ])

    const result = ratingEngine.computeMatch(
      { rating: winnerRating.rating, matchesPlayed: winnerRating.matchesPlayed },
      { rating: loserRating.rating, matchesPlayed: loserRating.matchesPlayed },
    )

    await tx.ratingHistory.createMany({
      data: [
        {
          userId: winnerId,
          gamemodeId: match.gamemodeId,
          matchId: match.id,
          ratingBefore: result.winner.ratingBefore,
          ratingAfter: result.winner.ratingAfter,
          delta: result.winner.delta,
          engine: ratingEngine.id,
        },
        {
          userId: loserId,
          gamemodeId: match.gamemodeId,
          matchId: match.id,
          ratingBefore: result.loser.ratingBefore,
          ratingAfter: result.loser.ratingAfter,
          delta: result.loser.delta,
          engine: ratingEngine.id,
        },
      ],
    })

    await tx.playerGamemodeRating.update({
      where: { id: winnerRating.id },
      data: {
        rating: result.winner.ratingAfter,
        wins: { increment: 1 },
        matchesPlayed: { increment: 1 },
      },
    })
    await tx.playerGamemodeRating.update({
      where: { id: loserRating.id },
      data: {
        rating: result.loser.ratingAfter,
        losses: { increment: 1 },
        matchesPlayed: { increment: 1 },
      },
    })

    // Status and reviewer were already written by the claim above.
    const updated = await tx.match.findUniqueOrThrow({
      where: { id: match.id },
    })

    await notifyMany(
      [
        {
          userId: winnerId,
          type: NOTIFICATION_TYPES.RATING_CHANGED,
          title: 'Match approved',
          body: `You gained ${result.winner.delta} rating in ${match.gamemode.name}, now ${result.winner.ratingAfter}.`,
          href: `/matches/${match.id}`,
        },
        {
          userId: loserId,
          type: NOTIFICATION_TYPES.RATING_CHANGED,
          title: 'Match approved',
          body: `You lost ${Math.abs(result.loser.delta)} rating in ${match.gamemode.name}, now ${result.loser.ratingAfter}.`,
          href: `/matches/${match.id}`,
        },
      ],
      tx,
    )

    await recordAudit(
      {
        actorId: params.reviewerId,
        action: AUDIT_ACTIONS.ADMIN_APPROVED_MATCH,
        targetType: 'Match',
        targetId: match.id,
        metadata: {
          winnerDelta: result.winner.delta,
          loserDelta: result.loser.delta,
          engine: ratingEngine.id,
        },
      },
      tx,
    )

    return updated
  })

  await resolveMatchApproval(match.id, {
    approved: true,
    decidedById: params.reviewerId,
    reason: params.reason ?? null,
  })

  return approved
}

/** Fetches a player's rating row for a gamemode, creating it on first match. */
async function ensureRating(
  tx: Prisma.TransactionClient,
  userId: string,
  gamemodeId: string,
) {
  const existing = await tx.playerGamemodeRating.findUnique({
    where: { userId_gamemodeId: { userId, gamemodeId } },
  })
  if (existing) return existing

  return tx.playerGamemodeRating.create({
    data: { userId, gamemodeId, rating: STARTING_RATING },
  })
}

/** Withdraw a submission before anyone has acted on it. */
export async function cancelMatch(params: {
  matchId: string
  submitterId: string
}) {
  const match = await db.match.findUnique({ where: { id: params.matchId } })
  if (!match) throw new MatchError('That match no longer exists.')
  if (match.submitterId !== params.submitterId) {
    throw new MatchError('Only the submitter can withdraw a match.')
  }
  if (match.status !== MATCH_STATUSES.PENDING_OPPONENT) {
    throw new MatchError('This match can no longer be withdrawn.')
  }

  return db.match.update({
    where: { id: match.id },
    data: { status: MATCH_STATUSES.CANCELLED },
  })
}
