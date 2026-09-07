import 'server-only'

import { MATCH_STATUSES } from '@/domain/constants'
import { db } from '@/lib/db'

/**
 * Match queries scoped to one player.
 *
 * Every query here is filtered by the caller's own id, so there is no way to
 * read another player's queue by changing a parameter.
 */

const matchInclude = {
  gamemode: { select: { slug: true, name: true, themeToken: true } },
  submitter: { select: { id: true, username: true, minecraftUsername: true } },
  opponent: { select: { id: true, username: true, minecraftUsername: true } },
  evidence: { select: { id: true, mimeType: true } },
} as const

/** Matches waiting on this player to confirm or dispute. */
export async function getMatchesAwaitingResponse(userId: string) {
  return db.match.findMany({
    where: { opponentId: userId, status: MATCH_STATUSES.PENDING_OPPONENT },
    orderBy: { createdAt: 'asc' },
    include: matchInclude,
  })
}

/** This player's own submissions that have not reached a decision. */
export async function getOwnPendingMatches(userId: string) {
  return db.match.findMany({
    where: {
      submitterId: userId,
      status: {
        in: [MATCH_STATUSES.PENDING_OPPONENT, MATCH_STATUSES.PENDING_ADMIN],
      },
    },
    orderBy: { createdAt: 'desc' },
    include: matchInclude,
  })
}

/** Everything this player has been involved in, decided or not. */
export async function getAllPlayerMatches(userId: string, limit = 50) {
  return db.match.findMany({
    where: { OR: [{ submitterId: userId }, { opponentId: userId }] },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      ...matchInclude,
      ratingHistory: { where: { userId }, select: { delta: true } },
    },
  })
}

export async function getDashboardSummary(userId: string) {
  const [awaitingResponse, ownPending, ratings, recentMatches] =
    await Promise.all([
      db.match.count({
        where: { opponentId: userId, status: MATCH_STATUSES.PENDING_OPPONENT },
      }),
      db.match.count({
        where: {
          submitterId: userId,
          status: {
            in: [MATCH_STATUSES.PENDING_OPPONENT, MATCH_STATUSES.PENDING_ADMIN],
          },
        },
      }),
      db.playerGamemodeRating.findMany({
        where: { userId },
        orderBy: { rating: 'desc' },
        include: { gamemode: true },
      }),
      db.match.findMany({
        where: {
          status: MATCH_STATUSES.APPROVED,
          OR: [{ submitterId: userId }, { opponentId: userId }],
        },
        orderBy: { reviewedAt: 'desc' },
        take: 5,
        include: {
          ...matchInclude,
          ratingHistory: { where: { userId }, select: { delta: true } },
        },
      }),
    ])

  return { awaitingResponse, ownPending, ratings, recentMatches }
}
