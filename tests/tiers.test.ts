import { describe, expect, it } from 'vitest'

import {
  formatTierRange,
  resolveTier,
  winRate,
  type TierDefinition,
} from '@/domain/tiers'

const tier = (
  label: string,
  minRating: number,
  maxRating: number | null,
  sortOrder: number,
): TierDefinition => ({
  id: label,
  label,
  minRating,
  maxRating,
  colorToken: `tier-${label.toLowerCase()}`,
  sortOrder,
})

const TIERS: TierDefinition[] = [
  tier('S', 1100, null, 0),
  tier('A', 1040, 1099, 1),
  tier('B', 980, 1039, 2),
  tier('C', 920, 979, 3),
  tier('D', 0, 919, 4),
]

describe('resolveTier', () => {
  it('places a rating inside its band', () => {
    expect(resolveTier(1000, TIERS)?.label).toBe('B')
    expect(resolveTier(950, TIERS)?.label).toBe('C')
  })

  it('is inclusive at the lower bound', () => {
    expect(resolveTier(1040, TIERS)?.label).toBe('A')
    expect(resolveTier(980, TIERS)?.label).toBe('B')
  })

  it('is inclusive at the upper bound', () => {
    expect(resolveTier(1099, TIERS)?.label).toBe('A')
    expect(resolveTier(1039, TIERS)?.label).toBe('B')
  })

  it('puts anything above the top threshold in the unbounded tier', () => {
    expect(resolveTier(1100, TIERS)?.label).toBe('S')
    expect(resolveTier(99999, TIERS)?.label).toBe('S')
  })

  it('handles a rating of zero', () => {
    expect(resolveTier(0, TIERS)?.label).toBe('D')
  })

  it('does not depend on the order rows arrive in', () => {
    const shuffled = [TIERS[2]!, TIERS[0]!, TIERS[4]!, TIERS[1]!, TIERS[3]!]
    expect(resolveTier(1050, shuffled)?.label).toBe('A')
  })

  it('returns null when no tier matches', () => {
    // A gap in the bands must not silently resolve to a neighbouring tier.
    const gapped = [tier('HIGH', 2000, null, 0), tier('LOW', 0, 500, 1)]
    expect(resolveTier(1000, gapped)).toBeNull()
  })

  it('returns null for an empty tier table', () => {
    expect(resolveTier(1000, [])).toBeNull()
  })

  it('returns null for a rating below every band', () => {
    const floored = [tier('ONLY', 500, null, 0)]
    expect(resolveTier(100, floored)).toBeNull()
  })
})

describe('formatTierRange', () => {
  it('renders an unbounded top tier with a plus', () => {
    expect(formatTierRange(TIERS[0]!)).toBe('1100+')
  })

  it('renders a bounded tier as a range', () => {
    expect(formatTierRange(TIERS[1]!)).toBe('1040–1099')
  })
})

describe('winRate', () => {
  it('computes a percentage to one decimal', () => {
    expect(winRate(1, 1)).toBe(50)
    expect(winRate(1, 2)).toBe(33.3)
    expect(winRate(2, 1)).toBe(66.7)
  })

  it('returns null with no matches, rather than a misleading zero', () => {
    expect(winRate(0, 0)).toBeNull()
  })

  it('handles unbeaten and winless records', () => {
    expect(winRate(5, 0)).toBe(100)
    expect(winRate(0, 5)).toBe(0)
  })
})
