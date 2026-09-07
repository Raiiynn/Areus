/**
 * Tier derivation.
 *
 * FULL_BUILD §1141 forbids hardcoding tier labels in components and §1164
 * requires tier to be derived from rating. Thresholds live in the `Tier` table
 * so they can be retuned without a deploy; this module turns those rows into a
 * lookup.
 */

export interface TierDefinition {
  id: string
  label: string
  minRating: number
  /** null on the top tier, which is unbounded above. */
  maxRating: number | null
  colorToken: string
  sortOrder: number
}

/**
 * Resolve the tier a rating falls into.
 *
 * Tiers are matched from the highest threshold downward, so the caller does not
 * have to guarantee the rows form a gapless range. Returns null when no tier
 * matches — a rating below the lowest band, or an empty tier table.
 */
export function resolveTier(
  rating: number,
  tiers: readonly TierDefinition[],
): TierDefinition | null {
  const ordered = [...tiers].sort((a, b) => b.minRating - a.minRating)

  for (const tier of ordered) {
    const aboveFloor = rating >= tier.minRating
    const belowCeiling = tier.maxRating === null || rating <= tier.maxRating
    if (aboveFloor && belowCeiling) return tier
  }

  return null
}

/** Human-readable band, e.g. "1600–1799" or "1800+". */
export function formatTierRange(tier: TierDefinition): string {
  return tier.maxRating === null
    ? `${tier.minRating}+`
    : `${tier.minRating}–${tier.maxRating}`
}

/**
 * Win rate as a percentage, rounded to one decimal.
 * Returns null when the player has no matches, so callers render "—" rather
 * than a misleading 0%.
 */
export function winRate(wins: number, losses: number): number | null {
  const total = wins + losses
  if (total === 0) return null
  return Math.round((wins / total) * 1000) / 10
}
