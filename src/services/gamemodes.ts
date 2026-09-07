import 'server-only'

import { db } from '@/lib/db'

/**
 * Gamemode queries — the single source of truth (FULL_BUILD §34).
 *
 * Every surface that shows or accepts a gamemode goes through this module.
 * There is no hardcoded gamemode array anywhere in the codebase, which is what
 * prevents the drift observed on the live site, where the Gamemodes page and
 * the Submit Match dropdown listed different sets.
 */

export async function listActiveGamemodes() {
  return db.gamemode.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getGamemodeBySlug(slug: string) {
  return db.gamemode.findUnique({ where: { slug } })
}

/** Active gamemodes with headline statistics for the landing page. */
export async function listGamemodesWithStats() {
  const gamemodes = await listActiveGamemodes()

  return Promise.all(
    gamemodes.map(async (gamemode) => {
      const [rankedPlayers, totalMatches, top, aggregate] = await Promise.all([
        db.playerGamemodeRating.count({
          where: { gamemodeId: gamemode.id, matchesPlayed: { gt: 0 } },
        }),
        db.match.count({
          where: { gamemodeId: gamemode.id, status: 'APPROVED' },
        }),
        db.playerGamemodeRating.findFirst({
          where: { gamemodeId: gamemode.id, matchesPlayed: { gt: 0 } },
          orderBy: { rating: 'desc' },
          include: {
            user: { select: { username: true, minecraftUsername: true } },
          },
        }),
        db.playerGamemodeRating.aggregate({
          where: { gamemodeId: gamemode.id, matchesPlayed: { gt: 0 } },
          _avg: { rating: true },
        }),
      ])

      return {
        ...gamemode,
        rankedPlayers,
        totalMatches,
        topPlayer: top?.user ?? null,
        topRating: top?.rating ?? null,
        averageRating: aggregate._avg.rating
          ? Math.round(aggregate._avg.rating)
          : null,
      }
    }),
  )
}

export async function listTiers() {
  return db.tier.findMany({ orderBy: { sortOrder: 'asc' } })
}
