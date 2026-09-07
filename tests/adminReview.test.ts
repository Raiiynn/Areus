import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { USER_STATUSES } from '@/domain/constants'
import { AdminError, reviewPlayer } from '@/services/admin'
import { clearTables, db, resetTestDatabase, seedFixture } from './helpers/testDb'

/**
 * The atomic claim on a registration decision.
 *
 * Before Discord, the only way to decide was the admin queue, which renders
 * buttons for an account it just read as pending — so a double decision was
 * hard to produce and invisible when it happened. A Discord card can sit in a
 * channel for hours with live buttons, which makes the race ordinary.
 */

let fixture: Awaited<ReturnType<typeof seedFixture>>

beforeAll(resetTestDatabase)

beforeEach(async () => {
  await clearTables()
  fixture = await seedFixture()
})

describe('reviewPlayer with expectedStatus', () => {
  it('applies the decision when the account is still pending', async () => {
    const updated = await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.pendingPlayer.id,
      decision: 'APPROVE',
      expectedStatus: USER_STATUSES.PENDING,
    })

    expect(updated.status).toBe(USER_STATUSES.APPROVED)
    expect(updated.statusChangedById).toBe(fixture.admin.id)
  })

  it('refuses once the account has already been decided', async () => {
    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.pendingPlayer.id,
      decision: 'APPROVE',
      expectedStatus: USER_STATUSES.PENDING,
    })

    await expect(
      reviewPlayer({
        actorId: fixture.owner.id,
        userId: fixture.pendingPlayer.id,
        decision: 'REJECT',
        reason: 'Changed my mind.',
        expectedStatus: USER_STATUSES.PENDING,
      }),
    ).rejects.toBeInstanceOf(AdminError)
  })

  it('writes nothing at all when the claim is lost', async () => {
    // The whole transaction rolls back, so there is no orphan audit row and no
    // second notification contradicting the first.
    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.pendingPlayer.id,
      decision: 'APPROVE',
      expectedStatus: USER_STATUSES.PENDING,
    })

    await reviewPlayer({
      actorId: fixture.owner.id,
      userId: fixture.pendingPlayer.id,
      decision: 'REJECT',
      reason: 'Changed my mind.',
      expectedStatus: USER_STATUSES.PENDING,
    }).catch(() => undefined)

    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.APPROVED)

    expect(
      await db.auditLog.count({ where: { targetId: fixture.pendingPlayer.id } }),
    ).toBe(1)
    expect(
      await db.notification.count({ where: { userId: fixture.pendingPlayer.id } }),
    ).toBe(1)
  })
})

describe('reviewPlayer without expectedStatus', () => {
  it('behaves exactly as it did before, from any status', async () => {
    // SUSPEND and REINSTATE must work whatever the account status is, which is
    // why the claim is opt-in rather than always on.
    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.alice.id,
      decision: 'SUSPEND',
      reason: 'Under investigation.',
    })

    const suspended = await db.user.findUniqueOrThrow({
      where: { id: fixture.alice.id },
    })
    expect(suspended.status).toBe(USER_STATUSES.SUSPENDED)

    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.alice.id,
      decision: 'REINSTATE',
    })

    const reinstated = await db.user.findUniqueOrThrow({
      where: { id: fixture.alice.id },
    })
    expect(reinstated.status).toBe(USER_STATUSES.APPROVED)
  })
})
