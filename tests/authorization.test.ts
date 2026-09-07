import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'

import { ROLES, USER_STATUSES } from '@/domain/constants'
import { hasAtLeastRole, isOwner, isStaff } from '@/lib/auth/roles'
import { AdminError, changeRole, reviewPlayer } from '@/services/admin'

import { clearTables, db, resetTestDatabase, seedFixture } from './helpers/testDb'

/**
 * Authorization and privilege escalation (FULL_BUILD §66, §1903).
 *
 * The rules under test are the ones that keep the hierarchy from being
 * reversible from below: an admin must not be able to reach owner powers, act
 * on an owner, or promote themselves.
 */

let fixture: Awaited<ReturnType<typeof seedFixture>>

beforeAll(() => {
  resetTestDatabase()
})

beforeEach(async () => {
  await clearTables()
  fixture = await seedFixture()
})

afterAll(async () => {
  await db.$disconnect()
})

describe('role ranking', () => {
  it('orders PLAYER < ADMIN < OWNER', () => {
    expect(hasAtLeastRole({ role: ROLES.PLAYER }, ROLES.PLAYER)).toBe(true)
    expect(hasAtLeastRole({ role: ROLES.PLAYER }, ROLES.ADMIN)).toBe(false)
    expect(hasAtLeastRole({ role: ROLES.PLAYER }, ROLES.OWNER)).toBe(false)

    expect(hasAtLeastRole({ role: ROLES.ADMIN }, ROLES.PLAYER)).toBe(true)
    expect(hasAtLeastRole({ role: ROLES.ADMIN }, ROLES.ADMIN)).toBe(true)
    expect(hasAtLeastRole({ role: ROLES.ADMIN }, ROLES.OWNER)).toBe(false)

    expect(hasAtLeastRole({ role: ROLES.OWNER }, ROLES.PLAYER)).toBe(true)
    expect(hasAtLeastRole({ role: ROLES.OWNER }, ROLES.ADMIN)).toBe(true)
    expect(hasAtLeastRole({ role: ROLES.OWNER }, ROLES.OWNER)).toBe(true)
  })

  it('admits the owner wherever an admin is required', () => {
    // Comparing rank rather than matching a role list is what makes this true
    // without anyone having to remember to add OWNER to an array.
    expect(isStaff({ role: ROLES.OWNER })).toBe(true)
    expect(isStaff({ role: ROLES.ADMIN })).toBe(true)
    expect(isStaff({ role: ROLES.PLAYER })).toBe(false)
  })

  it('treats an unrecognised role as no privilege at all', () => {
    // A corrupted or injected role value must fail closed.
    expect(hasAtLeastRole({ role: 'SUPERUSER' }, ROLES.PLAYER)).toBe(false)
    expect(hasAtLeastRole({ role: '' }, ROLES.PLAYER)).toBe(false)
    expect(isStaff({ role: 'admin' })).toBe(false) // case-sensitive on purpose
    expect(isOwner({ role: 'OWNER ' })).toBe(false)
  })
})

describe('reviewPlayer — escalation guards', () => {
  it('approves a pending registration', async () => {
    const updated = await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.pendingPlayer.id,
      decision: 'APPROVE',
    })

    expect(updated.status).toBe(USER_STATUSES.APPROVED)
    expect(updated.statusChangedById).toBe(fixture.admin.id)
  })

  it('refuses to let anyone act on their own account', async () => {
    await expect(
      reviewPlayer({
        actorId: fixture.admin.id,
        userId: fixture.admin.id,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(/your own account/i)
  })

  it('refuses to let an admin act on the owner', async () => {
    await expect(
      reviewPlayer({
        actorId: fixture.admin.id,
        userId: fixture.owner.id,
        decision: 'SUSPEND',
        reason: 'Attempted takeover.',
      }),
    ).rejects.toThrow(/owner account cannot be modified/i)
  })

  it('refuses to let an admin act on another admin', async () => {
    const secondAdmin = await db.user.create({
      data: {
        username: 'Admin2',
        usernameNormalized: 'admin2',
        email: 'admin2@test.local',
        emailNormalized: 'admin2@test.local',
        passwordHash: 'x',
        minecraftUsername: 'Admin2',
        role: ROLES.ADMIN,
        status: USER_STATUSES.APPROVED,
      },
    })

    await expect(
      reviewPlayer({
        actorId: fixture.admin.id,
        userId: secondAdmin.id,
        decision: 'SUSPEND',
        reason: 'Rivalry.',
      }),
    ).rejects.toThrow(/Only the owner/i)
  })

  it('lets the owner act on an admin', async () => {
    const updated = await reviewPlayer({
      actorId: fixture.owner.id,
      userId: fixture.admin.id,
      decision: 'SUSPEND',
      reason: 'Under investigation.',
    })

    expect(updated.status).toBe(USER_STATUSES.SUSPENDED)
  })

  it('destroys every session when an account is suspended', async () => {
    await db.session.create({
      data: {
        tokenHash: 'hash-for-alice',
        userId: fixture.alice.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    })

    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.alice.id,
      decision: 'SUSPEND',
      reason: 'Falsified evidence.',
    })

    // A suspension that leaves live sessions behind is not a suspension.
    const sessions = await db.session.findMany({
      where: { userId: fixture.alice.id },
    })
    expect(sessions).toHaveLength(0)
  })

  it('records an audit entry for every decision', async () => {
    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.pendingPlayer.id,
      decision: 'APPROVE',
    })

    const audit = await db.auditLog.findFirst({
      where: { action: 'ADMIN_APPROVED_PLAYER' },
    })
    expect(audit!.actorId).toBe(fixture.admin.id)
    expect(audit!.targetId).toBe(fixture.pendingPlayer.id)
  })

  it('notifies the affected player', async () => {
    await reviewPlayer({
      actorId: fixture.admin.id,
      userId: fixture.pendingPlayer.id,
      decision: 'REJECT',
      reason: 'Username does not exist.',
    })

    const notification = await db.notification.findFirst({
      where: { userId: fixture.pendingPlayer.id },
    })
    expect(notification!.type).toBe('REGISTRATION_REJECTED')
    expect(notification!.body).toContain('Username does not exist.')
  })
})

describe('changeRole — owner only', () => {
  it('promotes an approved player to admin', async () => {
    const updated = await changeRole({
      actorId: fixture.owner.id,
      userId: fixture.alice.id,
      role: 'ADMIN',
    })

    expect(updated.role).toBe(ROLES.ADMIN)
  })

  it('demotes an admin to player', async () => {
    const updated = await changeRole({
      actorId: fixture.owner.id,
      userId: fixture.admin.id,
      role: 'PLAYER',
    })

    expect(updated.role).toBe(ROLES.PLAYER)
  })

  it('refuses to change your own role', async () => {
    await expect(
      changeRole({
        actorId: fixture.owner.id,
        userId: fixture.owner.id,
        role: 'PLAYER',
      }),
    ).rejects.toThrow(/your own role/i)
  })

  it('refuses to change the owner role', async () => {
    // There is no code path that creates a second owner, by design.
    await expect(
      changeRole({
        actorId: fixture.owner.id,
        userId: fixture.owner.id,
        role: 'ADMIN',
      }),
    ).rejects.toThrow(AdminError)
  })

  it('refuses to promote a player who is not approved', async () => {
    await expect(
      changeRole({
        actorId: fixture.owner.id,
        userId: fixture.pendingPlayer.id,
        role: 'ADMIN',
      }),
    ).rejects.toThrow(/approved player/i)
  })

  it('refuses a no-op role change', async () => {
    await expect(
      changeRole({
        actorId: fixture.owner.id,
        userId: fixture.alice.id,
        role: 'PLAYER',
      }),
    ).rejects.toThrow(/already a player/i)
  })

  it('records who promoted whom', async () => {
    await changeRole({
      actorId: fixture.owner.id,
      userId: fixture.alice.id,
      role: 'ADMIN',
    })

    const audit = await db.auditLog.findFirst({
      where: { action: 'OWNER_PROMOTED_ADMIN' },
    })
    expect(audit!.actorId).toBe(fixture.owner.id)
    expect(audit!.targetId).toBe(fixture.alice.id)
  })
})
