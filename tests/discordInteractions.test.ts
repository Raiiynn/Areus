import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUDIT_ACTIONS,
  DISCORD_APPROVAL_KINDS,
  MATCH_STATUSES,
  USER_STATUSES,
  type DiscordApprovalKind,
} from '@/domain/constants'
import { APPROVAL_ACTIONS, encodeApprovalId } from '@/lib/discord/customId'
import { clearTables, db, resetTestDatabase, seedFixture } from './helpers/testDb'

/**
 * The Discord decision path, end to end from a payload to the database.
 *
 * This is where authorization for a session-free caller is proved. The route
 * handler is not exercised — it does nothing but verify a signature and hand
 * over — so everything that matters is reachable here.
 */

vi.mock('@/lib/discord/rest', () => ({
  DiscordError: class DiscordError extends Error {},
  createMessage: vi.fn(async () => 'discord-message-1'),
  editMessage: vi.fn(async () => undefined),
  editInteractionOriginal: vi.fn(async () => undefined),
}))

const GUILD = '2'
const CHANNEL = '3'
const ADMIN_DISCORD_ID = '111111111111111111'

function configure() {
  vi.stubEnv('DISCORD_BOT_TOKEN', 'token')
  vi.stubEnv('DISCORD_PUBLIC_KEY', 'ab'.repeat(32))
  vi.stubEnv('DISCORD_APPLICATION_ID', '1')
  vi.stubEnv('DISCORD_GUILD_ID', GUILD)
  vi.stubEnv('DISCORD_APPROVALS_CHANNEL_ID', CHANNEL)
}

function click(customId: string, discordUserId: string | null) {
  return {
    type: 3,
    guild_id: GUILD,
    channel_id: CHANNEL,
    member: discordUserId ? { user: { id: discordUserId } } : undefined,
    data: { custom_id: customId },
  }
}

function modalSubmit(customId: string, discordUserId: string, reason: string) {
  return {
    type: 5,
    guild_id: GUILD,
    channel_id: CHANNEL,
    member: { user: { id: discordUserId } },
    data: {
      custom_id: customId,
      components: [{ components: [{ custom_id: 'reason', value: reason }] }],
    },
  }
}

let fixture: Awaited<ReturnType<typeof seedFixture>>

beforeAll(resetTestDatabase)

beforeEach(async () => {
  vi.resetModules()
  vi.unstubAllEnvs()
  configure()
  await clearTables()
  fixture = await seedFixture()
  await db.user.update({
    where: { id: fixture.admin.id },
    data: { discordUserId: ADMIN_DISCORD_ID },
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

async function handle(payload: unknown) {
  const { handleDiscordInteraction } = await import(
    '@/services/discordInteractions'
  )
  return handleDiscordInteraction(payload as never)
}

function approveId(
  targetId: string,
  kind: DiscordApprovalKind = DISCORD_APPROVAL_KINDS.PLAYER,
) {
  return encodeApprovalId(kind, APPROVAL_ACTIONS.APPROVE, targetId)
}

describe('handshake', () => {
  it('answers a PING with a PONG', async () => {
    expect(await handle({ type: 1 })).toEqual({ type: 1 })
  })
})

describe('authorization', () => {
  it('refuses an unlinked Discord account', async () => {
    const response = await handle(
      click(approveId(fixture.pendingPlayer.id), '999999999999999999'),
    )

    expect(JSON.stringify(response)).toContain('not linked')
    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.PENDING)
  })

  it('refuses a linked account that is only a PLAYER', async () => {
    // Being in the Discord channel is not authority. The role in AREUS is.
    await db.user.update({
      where: { id: fixture.alice.id },
      data: { discordUserId: '222222222222222222' },
    })

    await handle(click(approveId(fixture.pendingPlayer.id), '222222222222222222'))

    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.PENDING)
  })

  it('refuses a suspended administrator', async () => {
    await db.user.update({
      where: { id: fixture.admin.id },
      data: { status: USER_STATUSES.SUSPENDED },
    })

    await handle(click(approveId(fixture.pendingPlayer.id), ADMIN_DISCORD_ID))

    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.PENDING)
  })

  it('refuses an interaction from another guild', async () => {
    const response = await handle({
      ...click(approveId(fixture.pendingPlayer.id), ADMIN_DISCORD_ID),
      guild_id: 'somewhere-else',
    })

    expect(JSON.stringify(response)).toContain('does not take decisions')
    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.PENDING)
  })

  it('refuses a malformed custom_id before touching the database', async () => {
    const response = await handle(click('not-ours', ADMIN_DISCORD_ID))
    expect(JSON.stringify(response)).toContain('no longer valid')
  })
})

describe('approving a registration', () => {
  it('approves, notifies and audits exactly once', async () => {
    await handle(click(approveId(fixture.pendingPlayer.id), ADMIN_DISCORD_ID))

    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.APPROVED)
    expect(player.statusChangedById).toBe(fixture.admin.id)

    const audits = await db.auditLog.findMany({
      where: { action: AUDIT_ACTIONS.ADMIN_APPROVED_PLAYER },
    })
    expect(audits).toHaveLength(1)

    const notifications = await db.notification.findMany({
      where: { userId: fixture.pendingPlayer.id },
    })
    expect(notifications).toHaveLength(1)
  })

  it('lets only one of two simultaneous decisions win', async () => {
    // The regression test for reviewPlayer's missing atomic claim. Without
    // expectedStatus both clicks succeeded and the player got contradictory
    // notifications.
    await handle(click(approveId(fixture.pendingPlayer.id), ADMIN_DISCORD_ID))
    const second = await handle(
      click(approveId(fixture.pendingPlayer.id), ADMIN_DISCORD_ID),
    )

    expect(JSON.stringify(second)).toContain('already been reviewed')

    const audits = await db.auditLog.findMany({
      where: { targetId: fixture.pendingPlayer.id },
    })
    expect(audits).toHaveLength(1)
    const notifications = await db.notification.findMany({
      where: { userId: fixture.pendingPlayer.id },
    })
    expect(notifications).toHaveLength(1)
  })
})

describe('rejecting a registration', () => {
  it('opens a modal rather than deciding immediately', async () => {
    // A rejection reason is mandatory and a button carries no text.
    const response = await handle({
      ...click(approveId(fixture.pendingPlayer.id), ADMIN_DISCORD_ID),
      data: {
        custom_id: encodeApprovalId(
          DISCORD_APPROVAL_KINDS.PLAYER,
          APPROVAL_ACTIONS.REJECT,
          fixture.pendingPlayer.id,
        ),
      },
    })

    expect((response as { type: number }).type).toBe(9)
    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.PENDING)
  })

  it('rejects with the submitted reason', async () => {
    await handle(
      modalSubmit(
        encodeApprovalId(
          DISCORD_APPROVAL_KINDS.PLAYER,
          APPROVAL_ACTIONS.REJECT_SUBMIT,
          fixture.pendingPlayer.id,
        ),
        ADMIN_DISCORD_ID,
        'Minecraft username does not exist.',
      ),
    )

    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.REJECTED)
    expect(player.statusReason).toBe('Minecraft username does not exist.')
  })

  it('refuses a reason too short for the schema', async () => {
    // The modal min_length is a courtesy; this is the enforcement.
    const response = await handle(
      modalSubmit(
        encodeApprovalId(
          DISCORD_APPROVAL_KINDS.PLAYER,
          APPROVAL_ACTIONS.REJECT_SUBMIT,
          fixture.pendingPlayer.id,
        ),
        ADMIN_DISCORD_ID,
        'no',
      ),
    )

    expect(JSON.stringify(response)).toContain('reason')
    const player = await db.user.findUniqueOrThrow({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(player.status).toBe(USER_STATUSES.PENDING)
  })
})

describe('deciding a match', () => {
  async function pendingMatch() {
    return db.match.create({
      data: {
        gamemodeId: fixture.sword.id,
        submitterId: fixture.alice.id,
        opponentId: fixture.bob.id,
        submitterScore: 3,
        opponentScore: 1,
        winnerId: fixture.alice.id,
        status: MATCH_STATUSES.PENDING_ADMIN,
        opponentConfirmedAt: new Date(),
      },
    })
  }

  it('approves and moves ratings', async () => {
    const match = await pendingMatch()

    await handle(
      click(approveId(match.id, DISCORD_APPROVAL_KINDS.MATCH), ADMIN_DISCORD_ID),
    )

    const reviewed = await db.match.findUniqueOrThrow({
      where: { id: match.id },
    })
    expect(reviewed.status).toBe(MATCH_STATUSES.APPROVED)
    expect(reviewed.reviewedById).toBe(fixture.admin.id)

    const history = await db.ratingHistory.findMany({
      where: { matchId: match.id },
    })
    expect(history).toHaveLength(2)
  })

  it('applies the rating change only once under a double click', async () => {
    const match = await pendingMatch()
    const id = approveId(match.id, DISCORD_APPROVAL_KINDS.MATCH)

    await handle(click(id, ADMIN_DISCORD_ID))
    const second = await handle(click(id, ADMIN_DISCORD_ID))

    // Sequentially the status precondition catches it first; the atomic claim
    // inside the transaction is what catches the genuinely concurrent case.
    // Either way the second click changes nothing, which is what matters here.
    expect(JSON.stringify(second)).toContain('not awaiting review')
    const history = await db.ratingHistory.findMany({
      where: { matchId: match.id },
    })
    expect(history).toHaveLength(2)
  })
})
