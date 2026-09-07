import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { MATCH_STATUSES, USER_STATUSES } from '@/domain/constants'
import { computeLiveVersion } from '@/services/live'
import { clearTables, db, resetTestDatabase, seedFixture } from './helpers/testDb'

/**
 * The change fingerprint the client polls.
 *
 * Its whole job is to be stable when nothing happened and different when
 * something did — a version that churns would make every admin tab re-render
 * on a timer, and one that misses a change would leave a handled queue item on
 * screen, which is the bug the poller exists to prevent.
 */

let fixture: Awaited<ReturnType<typeof seedFixture>>

beforeAll(resetTestDatabase)

beforeEach(async () => {
  await clearTables()
  fixture = await seedFixture()
})

describe('staff version', () => {
  it('is stable across two calls with no writes in between', async () => {
    const first = await computeLiveVersion(fixture.admin)
    const second = await computeLiveVersion(fixture.admin)
    expect(second).toBe(first)
  })

  it('changes when a pending registration is decided', async () => {
    const before = await computeLiveVersion(fixture.admin)

    await db.user.update({
      where: { id: fixture.pendingPlayer.id },
      data: { status: USER_STATUSES.APPROVED },
    })

    expect(await computeLiveVersion(fixture.admin)).not.toBe(before)
  })

  it('changes when a match reaches the review queue', async () => {
    const before = await computeLiveVersion(fixture.admin)

    await db.match.create({
      data: {
        gamemodeId: fixture.sword.id,
        submitterId: fixture.alice.id,
        opponentId: fixture.bob.id,
        submitterScore: 3,
        opponentScore: 1,
        winnerId: fixture.alice.id,
        status: MATCH_STATUSES.PENDING_ADMIN,
      },
    })

    expect(await computeLiveVersion(fixture.admin)).not.toBe(before)
  })

  it('ignores a match that is not awaiting admin review', async () => {
    const before = await computeLiveVersion(fixture.admin)

    await db.match.create({
      data: {
        gamemodeId: fixture.sword.id,
        submitterId: fixture.alice.id,
        opponentId: fixture.bob.id,
        submitterScore: 3,
        opponentScore: 1,
        winnerId: fixture.alice.id,
        status: MATCH_STATUSES.PENDING_OPPONENT,
      },
    })

    expect(await computeLiveVersion(fixture.admin)).toBe(before)
  })
})

describe('player version', () => {
  it('is scoped to the viewer, not the queue', async () => {
    // A player must not be able to infer the size of the admin queue from a
    // version string they can poll.
    const before = await computeLiveVersion(fixture.alice)

    await db.user.update({
      where: { id: fixture.pendingPlayer.id },
      data: { status: USER_STATUSES.APPROVED },
    })

    expect(await computeLiveVersion(fixture.alice)).toBe(before)
  })

  it('changes when the viewer own status changes', async () => {
    const before = await computeLiveVersion(fixture.pendingPlayer)

    await db.user.update({
      where: { id: fixture.pendingPlayer.id },
      data: { status: USER_STATUSES.APPROVED },
    })

    expect(await computeLiveVersion(fixture.pendingPlayer)).not.toBe(before)
  })

  it('changes when an unread notification arrives', async () => {
    const before = await computeLiveVersion(fixture.alice)

    await db.notification.create({
      data: {
        userId: fixture.alice.id,
        type: 'MATCH_APPROVED',
        title: 'Match approved',
        body: 'Your match was approved.',
      },
    })

    expect(await computeLiveVersion(fixture.alice)).not.toBe(before)
  })
})
