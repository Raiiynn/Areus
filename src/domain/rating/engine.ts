/**
 * Rating engine contract.
 *
 * FULL_BUILD §1116 requires that the architecture permit Glicko-2 or TrueSkill
 * later without rewriting callers. Everything outside this folder depends on
 * this interface, never on the ELO implementation directly.
 *
 * Engines must be pure: same inputs, same outputs, no clock, no database, no
 * randomness. That is what makes the rating rules testable without a server.
 */

export interface RatingPlayerState {
  rating: number
  /** Completed matches in this gamemode. Drives provisional K-factor. */
  matchesPlayed: number
}

export interface RatingOutcome {
  /** 1 = winner, 0 = loser. Draws are not supported: PvP matches have a winner. */
  score: 0 | 1
}

export interface RatingChange {
  ratingBefore: number
  ratingAfter: number
  delta: number
}

export interface RatingResult {
  winner: RatingChange
  loser: RatingChange
}

export interface RatingEngine {
  /** Stable identifier recorded on every RatingHistory row. */
  readonly id: string

  computeMatch(winner: RatingPlayerState, loser: RatingPlayerState): RatingResult
}
