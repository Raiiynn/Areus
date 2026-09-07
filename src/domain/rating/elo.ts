import { PROVISIONAL_MATCH_THRESHOLD } from '@/domain/constants'
import type {
  RatingEngine,
  RatingPlayerState,
  RatingResult,
} from '@/domain/rating/engine'

/**
 * Standard ELO.
 *
 * Expected score for A against B:
 *
 *     E_a = 1 / (1 + 10^((R_b - R_a) / 400))
 *
 * New rating:
 *
 *     R' = R + K * (S - E)
 *
 * where S is 1 for the winner and 0 for the loser.
 *
 * The 400 constant means a 400-point lead implies a 10:1 expected win ratio,
 * which is the convention players coming from chess or other ladders expect.
 */

/** K-factor for a player whose rating is still provisional. */
const K_PROVISIONAL = 40

/** K-factor once a player has enough matches for their rating to be trusted. */
const K_ESTABLISHED = 20

/**
 * Ratings are stored as integers. Rounding half away from zero keeps the
 * winner's gain and the loser's loss symmetric when both players share a
 * K-factor — with Math.round, a .5 delta would round both upward and quietly
 * inject rating into the pool.
 */
function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

export function kFactor(state: RatingPlayerState): number {
  return state.matchesPlayed < PROVISIONAL_MATCH_THRESHOLD
    ? K_PROVISIONAL
    : K_ESTABLISHED
}

export class EloRatingEngine implements RatingEngine {
  readonly id = 'elo'

  computeMatch(
    winner: RatingPlayerState,
    loser: RatingPlayerState,
  ): RatingResult {
    const winnerExpected = expectedScore(winner.rating, loser.rating)
    const loserExpected = expectedScore(loser.rating, winner.rating)

    const winnerDelta = roundHalfAwayFromZero(
      kFactor(winner) * (1 - winnerExpected),
    )
    const loserDelta = roundHalfAwayFromZero(kFactor(loser) * (0 - loserExpected))

    return {
      winner: {
        ratingBefore: winner.rating,
        ratingAfter: winner.rating + winnerDelta,
        delta: winnerDelta,
      },
      loser: {
        ratingBefore: loser.rating,
        ratingAfter: loser.rating + loserDelta,
        delta: loserDelta,
      },
    }
  }
}

/** The engine the application currently uses. */
export const ratingEngine: RatingEngine = new EloRatingEngine()
