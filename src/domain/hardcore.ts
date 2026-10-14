/** Public Minecraft telemetry. Never add account secrets or connection details. */
export interface Survivor {
  uuid: string
  username: string
  edition: 'Java' | 'Bedrock' | null
  seasonId: string
  factionId: string | null
  factionName: string | null
  kills: number
  deaths: number
  playtimeMinutes: number
  longestSurvivalMinutes: number
  survivalMinutes: number
  deathBanCount: number
  achievements: string[]
}

export interface Faction {
  id: string
  name: string
  tag: string
  description: string
  leaderUuid: string
  memberUuids: string[]
  kills: number | null
  deaths: number | null
  power: number | null
  territory: number | null
  warWins: number | null
  warLosses: number | null
  survivalMinutesPerMember: number | null
  achievements: string[]
}

export interface DeathEvent {
  id: string
  playerUuid: string
  username: string
  cause: string
  occurredAt: string
  factionName: string | null
  deathBanExpiresAt: string | null
}

export interface SeasonEvent {
  id: string
  title: string
  category: string
  description: string
  startsAt: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
}

export const SURVIVAL_CATEGORIES = {
  survivors: 'Top survivors',
  kills: 'Most kills',
  longest: 'Longest survival',
  active: 'Most active',
  deaths: 'Most deaths',
  kd: 'Best K/D ratio',
} as const
export type SurvivalCategory = keyof typeof SURVIVAL_CATEGORIES
export const SMP_PAGE_SIZE = 20
export const DEATHBAN_MINUTES = 30
export function isMinecraftUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}
export const PROPOSED_FACTION_WEIGHTS = {
  pvp: 0.35,
  wars: 0.3,
  survival: 0.2,
  territory: 0.15,
} as const
export type FactionWeights = Record<
  keyof typeof PROPOSED_FACTION_WEIGHTS,
  number
>

/** Infinity represents a deathless record; 0/0 remains zero. */
export function killDeathRatio(kills: number, deaths: number): number {
  return deaths === 0 ? (kills > 0 ? Infinity : 0) : kills / deaths
}

export function formatRatio(
  kills: number | null,
  deaths: number | null,
): string {
  if (kills === null || deaths === null) return 'Unavailable'
  const ratio = killDeathRatio(kills, deaths)
  return Number.isFinite(ratio) ? ratio.toFixed(2) : 'Deathless'
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return hours >= 24
    ? `${Math.floor(hours / 24)}d ${hours % 24}h`
    : `${hours}h ${Math.floor(minutes % 60)}m`
}

/** Ranking is survival-first; PvP match ratings are never used as a substitute. */
export function filterSurvivors(
  players: readonly Survivor[],
  query: string,
  category: SurvivalCategory,
  season: string,
  page: number,
) {
  const metric = (player: Survivor) => {
    switch (category) {
      case 'kills':
        return player.kills
      case 'deaths':
        return player.deaths
      case 'longest':
        return player.longestSurvivalMinutes
      case 'active':
        return player.playtimeMinutes
      case 'kd':
        return killDeathRatio(player.kills, player.deaths)
      default:
        return player.survivalMinutes
    }
  }
  const matching = players
    .filter(
      (player) =>
        (!season || player.seasonId === season) &&
        `${player.username} ${player.factionName ?? ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase().slice(0, 80)),
    )
    .sort((a, b) => {
      const left = metric(a),
        right = metric(b)
      return left === right
        ? a.uuid.localeCompare(b.uuid)
        : left > right
          ? -1
          : 1
    })
  const pageCount = Math.max(1, Math.ceil(matching.length / SMP_PAGE_SIZE))
  const currentPage = Math.max(
    1,
    Math.min(pageCount, Number.isSafeInteger(page) ? page : 1),
  )
  const offset = (currentPage - 1) * SMP_PAGE_SIZE
  return {
    rows: matching.slice(offset, offset + SMP_PAGE_SIZE),
    total: matching.length,
    page: currentPage,
    pageCount,
    offset,
  }
}

/** Proposed peer-normalized score. Missing metrics leave a faction unranked. */
export function rankFactions(
  factions: readonly Faction[],
  weights: FactionWeights = PROPOSED_FACTION_WEIGHTS,
) {
  if (
    Object.values(weights).some(
      (weight) => !Number.isFinite(weight) || weight < 0,
    ) ||
    Math.abs(
      Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1,
    ) > 0.000001
  ) {
    throw new Error('Faction weights must be non-negative and sum to one.')
  }
  const complete = factions.filter(
    (faction) =>
      faction.memberUuids.length > 0 &&
      [
        faction.kills,
        faction.deaths,
        faction.warWins,
        faction.warLosses,
        faction.survivalMinutesPerMember,
        faction.territory,
      ].every(
        (value) => value !== null && Number.isFinite(value) && value >= 0,
      ),
  )
  const metrics = complete.map((faction) => ({
    faction,
    // Per-member kill contribution and finite smoothed K/D avoid size and infinity bias.
    pvp:
      faction.kills! /
      faction.memberUuids.length /
      (faction.deaths! / faction.memberUuids.length + 1),
    wars: faction.warWins! / Math.max(1, faction.warWins! + faction.warLosses!),
    survival: faction.survivalMinutesPerMember!,
    territory: faction.territory!,
  }))
  const keys = Object.keys(weights) as Array<keyof FactionWeights>
  const ranges = Object.fromEntries(
    keys.map((key) => {
      const values = metrics.map((peer) => peer[key])
      return [key, { min: Math.min(...values), max: Math.max(...values) }]
    }),
  ) as Record<keyof FactionWeights, { min: number; max: number }>
  return metrics
    .map((row) => ({
      faction: row.faction,
      score: keys.reduce((score, key) => {
        const { min, max } = ranges[key]
        const normalized = max === min ? 0.5 : (row[key] - min) / (max - min)
        return score + normalized * weights[key] * 100
      }, 0),
    }))
    .sort(
      (a, b) => b.score - a.score || a.faction.id.localeCompare(b.faction.id),
    )
}

export const SMP_FEATURES = [
  [
    'DeathBan',
    `A ${DEATHBAN_MINUTES}-minute temporary login restriction after death.`,
  ],
  ['Sit', 'Take a seat between adventures.'],
  ['Carry player / Gendong', 'Carry another player on your travels.'],
  ['Anti-Xray', 'Keep resource discovery fair.'],
  ['Custom resource pack', 'A shared visual identity for the season.'],
  ['Player search / Geledah', 'Inspect players under the server rules.'],
  ['Faction system', 'Build a faction and write your shared story.'],
  ['No Arrow of Harming', 'Proposed restriction on Harming arrows.'],
  ['No Strength II', 'Proposed restriction on Strength II.'],
  ['Random spawn', 'Begin your journey somewhere unexpected.'],
] as const
