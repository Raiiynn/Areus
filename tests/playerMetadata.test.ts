import { beforeEach, describe, expect, it, vi } from 'vitest'
import { USER_STATUSES, ROLES } from '@/domain/constants'
import { getPlayerByUsername } from '@/services/players'
import { generateMetadata } from '@/app/players/[username]/page'

vi.mock('@/services/players', () => ({
  getPlayerByUsername: vi.fn(),
  getPlayerMatches: vi.fn(),
  getRecentForm: vi.fn(),
}))

const profile = {
  id: 'test-only',
  username: 'TestOnly',
  minecraftUsername: 'TestOnly',
  role: ROLES.PLAYER,
  status: USER_STATUSES.PENDING,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ratings: [],
}

describe('public profile metadata visibility', () => {
  beforeEach(() => vi.clearAllMocks())
  it.each([
    USER_STATUSES.PENDING,
    USER_STATUSES.SUSPENDED,
    USER_STATUSES.REJECTED,
  ])('does not publish metadata for %s accounts', async (status) => {
    vi.mocked(getPlayerByUsername).mockResolvedValue({ ...profile, status })
    expect(
      await generateMetadata({
        params: Promise.resolve({ username: profile.username }),
      }),
    ).toEqual({ title: 'Player not found' })
  })
  it('retains approved username profile metadata', async () => {
    vi.mocked(getPlayerByUsername).mockResolvedValue({
      ...profile,
      status: USER_STATUSES.APPROVED,
    })
    expect(
      (
        await generateMetadata({
          params: Promise.resolve({ username: profile.username }),
        })
      ).title,
    ).toBe('TestOnly')
  })
  it('does not resolve a canonical UUID as a website username', async () => {
    expect(
      await generateMetadata({
        params: Promise.resolve({
          username: '00000000-0000-0000-0000-000000000001',
        }),
      }),
    ).toEqual({ title: 'Player not found' })
    expect(getPlayerByUsername).not.toHaveBeenCalled()
  })
})
