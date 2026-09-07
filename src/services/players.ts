import 'server-only'

import { MATCH_STATUSES, PAGE_SIZE, USER_STATUSES } from '@/domain/constants'
import { db } from '@/lib/db'
import type { PlayerFilters } from '@/lib/validation/schemas'

/**
 * Player roster and profile queries.
 *
 * Every list here is paginated at the database (MASTER_PROMPT §12) — no query
 * in this module can return an unbounded result set.
 */

/** Public projection. Never selects passwordHash or email. */
const publicUserSelect = {
  id: true,
  username: true,
  minecraftUsername: true,
  role: true,
  status: true,
  createdAt: true,
} as const

export async function listPlayers(filters: PlayerFilters) {
  const page = filters.page ?? 1
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    status: USER_STATUSES.APPROVED,
    ...(filters.q
      ? { usernameNormalized: { contains: filters.q.toLowerCase() } }
      : {}),
    ...(filters.gamemode
      ? { ratings: { some: { gamemode: { slug: filters.gamemode } } } }
      : {}),
  }

  const [players, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        ...publicUserSelect,
        ratings: {
          where: filters.gamemode
            ? { gamemode: { slug: filters.gamemode } }
            : undefined,
          include: { gamemode: { select: { slug: true, name: true } } },
          orderBy: { rating: 'desc' },
        },
      },
      orderBy:
        filters.sort === 'username'
          ? { usernameNormalized: 'asc' }
          : { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ])

  // Peak rating across gamemodes is a derived value, so it is computed here
  // rather than stored and kept in sync.
  const shaped = players.map((player) => {
    const best = player.ratings.reduce<(typeof player.ratings)[number] | null>(
      (acc, r) => (acc === null || r.rating > acc.rating ? r : acc),
      null,
    )
    return {
      ...player,
      bestRating: best?.rating ?? null,
      bestGamemode: best?.gamemode ?? null,
      totalMatches: player.ratings.reduce((sum, r) => sum + r.matchesPlayed, 0),
    }
  })

  // Rating sort happens after shaping because it orders by a derived value that
  // SQL cannot express without a subquery per row.
  if (filters.sort === 'rating' || !filters.sort) {
    shaped.sort((a, b) => (b.bestRating ?? -1) - (a.bestRating ?? -1))
  } else if (filters.sort === 'matches') {
    shaped.sort((a, b) => b.totalMatches - a.totalMatches)
  }

  return {
    players: shaped,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

export async function getPlayerByUsername(username: string) {
  return db.user.findUnique({
    where: { usernameNormalized: username.toLowerCase() },
    select: {
      ...publicUserSelect,
      ratings: {
        include: { gamemode: true },
        orderBy: { rating: 'desc' },
      },
    },
  })
}

/** Approved matches involving a player, most recent first. */
export async function getPlayerMatches(userId: string, limit = 20) {
  return db.match.findMany({
    where: {
      status: MATCH_STATUSES.APPROVED,
      OR: [{ submitterId: userId }, { opponentId: userId }],
    },
    orderBy: { reviewedAt: 'desc' },
    take: limit,
    include: {
      gamemode: { select: { slug: true, name: true, themeToken: true } },
      submitter: { select: { id: true, username: true, minecraftUsername: true } },
      opponent: { select: { id: true, username: true, minecraftUsername: true } },
      ratingHistory: { where: { userId }, select: { delta: true } },
    },
  })
}

/**
 * Recent form as a win/loss sequence, most recent first.
 * Reads from approved matches only — pending results must not leak into a
 * public profile.
 */
export async function getRecentForm(
  userId: string,
  limit = 5,
): Promise<Array<'W' | 'L'>> {
  const matches = await db.match.findMany({
    where: {
      status: MATCH_STATUSES.APPROVED,
      OR: [{ submitterId: userId }, { opponentId: userId }],
    },
    orderBy: { reviewedAt: 'desc' },
    take: limit,
    select: { winnerId: true },
  })

  return matches.map((m) => (m.winnerId === userId ? 'W' : 'L'))
}

/** Head-to-head record between two players across all gamemodes. */
export async function getHeadToHead(userId: string, opponentId: string) {
  const matches = await db.match.findMany({
    where: {
      status: MATCH_STATUSES.APPROVED,
      OR: [
        { submitterId: userId, opponentId },
        { submitterId: opponentId, opponentId: userId },
      ],
    },
    select: { winnerId: true },
  })

  const wins = matches.filter((m) => m.winnerId === userId).length
  return { wins, losses: matches.length - wins, total: matches.length }
}

/** Leaderboard for one gamemode. Paginated at the database. */
export async function getLeaderboard(gamemodeSlug: string, page = 1) {
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    gamemode: { slug: gamemodeSlug },
    matchesPlayed: { gt: 0 },
    user: { status: USER_STATUSES.APPROVED },
  }

  const [rows, total] = await Promise.all([
    db.playerGamemodeRating.findMany({
      where,
      orderBy: [{ rating: 'desc' }, { wins: 'desc' }],
      skip,
      take: PAGE_SIZE,
      include: { user: { select: publicUserSelect } },
    }),
    db.playerGamemodeRating.count({ where }),
  ])

  return {
    rows: rows.map((row, index) => ({ ...row, rank: skip + index + 1 })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** Top players across all gamemodes, for the landing page podium. */
export async function getTopPlayers(limit = 3) {
  const rows = await db.playerGamemodeRating.findMany({
    where: { matchesPlayed: { gt: 0 }, user: { status: USER_STATUSES.APPROVED } },
    orderBy: { rating: 'desc' },
    take: limit,
    include: {
      user: { select: publicUserSelect },
      gamemode: { select: { slug: true, name: true, themeToken: true } },
    },
  })

  return rows.map((row, index) => ({ ...row, position: index + 1 }))
}
