import { describe, expect, it } from 'vitest'

import { PROVISIONAL_MATCH_THRESHOLD } from '@/domain/constants'
import { EloRatingEngine, expectedScore, kFactor } from '@/domain/rating/elo'

const engine = new EloRatingEngine()

/** An established player (past the provisional window) on a given rating. */
const established = (rating: number) => ({
  rating,
  matchesPlayed: PROVISIONAL_MATCH_THRESHOLD + 5,
})

describe('expectedScore', () => {
  it('gives evenly matched players a 50% expectation', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 10)
  })

  it('gives a 400-point lead roughly a 10:1 expectation', () => {
    // The 400 constant is the whole point of the ELO scale; if this drifts,
    // every rating in the system means something different.
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 6)
  })

  it('is symmetric — both expectations sum to 1', () => {
    const a = expectedScore(1523, 1187)
    const b = expectedScore(1187, 1523)
    expect(a + b).toBeCloseTo(1, 10)
  })
})

describe('kFactor', () => {
  it('uses the provisional factor below the threshold', () => {
    expect(kFactor({ rating: 1000, matchesPlayed: 0 })).toBe(40)
    expect(
      kFactor({ rating: 1000, matchesPlayed: PROVISIONAL_MATCH_THRESHOLD - 1 }),
    ).toBe(40)
  })

  it('drops to the established factor at the threshold', () => {
    expect(
      kFactor({ rating: 1000, matchesPlayed: PROVISIONAL_MATCH_THRESHOLD }),
    ).toBe(20)
  })
})

describe('EloRatingEngine.computeMatch', () => {
  it('raises the winner and lowers the loser', () => {
    const result = engine.computeMatch(established(1000), established(1000))

    expect(result.winner.delta).toBeGreaterThan(0)
    expect(result.loser.delta).toBeLessThan(0)
    expect(result.winner.ratingAfter).toBe(1000 + result.winner.delta)
    expect(result.loser.ratingAfter).toBe(1000 + result.loser.delta)
  })

  it('splits K evenly when equally rated players meet', () => {
    const result = engine.computeMatch(established(1000), established(1000))
    // K=20, expectation 0.5, so 20 * 0.5 = 10 each way.
    expect(result.winner.delta).toBe(10)
    expect(result.loser.delta).toBe(-10)
  })

  it('conserves rating when both players share a K-factor', () => {
    // Rating must not be created or destroyed, or the ladder inflates over time.
    const result = engine.computeMatch(established(1487), established(1203))
    expect(result.winner.delta + result.loser.delta).toBe(0)
  })

  it('awards little for beating a much weaker opponent', () => {
    const result = engine.computeMatch(established(1800), established(1000))
    expect(result.winner.delta).toBeLessThanOrEqual(1)
  })

  it('awards heavily for beating a much stronger opponent', () => {
    const result = engine.computeMatch(established(1000), established(1800))
    expect(result.winner.delta).toBeGreaterThanOrEqual(19)
  })

  it('moves provisional players faster than established ones', () => {
    const provisional = engine.computeMatch(
      { rating: 1000, matchesPlayed: 0 },
      established(1000),
    )
    const settled = engine.computeMatch(established(1000), established(1000))

    expect(provisional.winner.delta).toBeGreaterThan(settled.winner.delta)
  })

  it('returns integer ratings', () => {
    const result = engine.computeMatch(established(1337), established(1042))

    for (const value of [
      result.winner.delta,
      result.winner.ratingAfter,
      result.loser.delta,
      result.loser.ratingAfter,
    ]) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  it('never reports a before-value that disagrees with the input', () => {
    const result = engine.computeMatch(established(1234), established(1111))
    expect(result.winner.ratingBefore).toBe(1234)
    expect(result.loser.ratingBefore).toBe(1111)
  })

  it('handles extreme rating gaps without producing NaN', () => {
    const result = engine.computeMatch(established(4000), established(100))
    expect(Number.isNaN(result.winner.delta)).toBe(false)
    expect(Number.isNaN(result.loser.delta)).toBe(false)
  })
})
