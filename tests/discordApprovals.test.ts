import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { DISCORD_APPROVAL_KINDS, MATCH_STATUSES } from '@/domain/constants'
import { clearTables, db, resetTestDatabase, seedFixture } from './helpers/testDb'

/**
 * Publishing and resolving Discord cards.
 *
 * The REST layer is the only thing mocked — everything else runs against the
 * real PostgreSQL database, because the behaviour under test is the ordering between a
 * database claim and an HTTP call, and mocking Prisma would test the mock.
 */

vi.mock('@/lib/discord/rest', () => ({
  DiscordError: class DiscordError extends Error {},
  createMessage: vi.fn(async () => 'discord-message-1'),
  editMessage: vi.fn(async () => undefined),
  editInteractionOriginal: vi.fn(async () => undefined),
}))

const rest = await import('@/lib/discord/rest')
const createMessage = vi.mocked(rest.createMessage)
const editMessage = vi.mocked(rest.editMessage)

// Present the module with a fully configured environment, so the inertness
// gate opens. Everything else in the suite leaves it closed.
function configure() {
  vi.stubEnv('DISCORD_BOT_TOKEN', 'token')
  vi.stubEnv('DISCORD_PUBLIC_KEY', 'ab'.repeat(32))
  vi.stubEnv('DISCORD_APPLICATION_ID', '1')
  vi.stubEnv('DISCORD_GUILD_ID', '2')
  vi.stubEnv('DISCORD_APPROVALS_CHANNEL_ID', '3')
}

let fixture: Awaited<ReturnType<typeof seedFixture>>

beforeAll(resetTestDatabase)

beforeEach(async () => {
  vi.resetModules()
  vi.unstubAllEnvs()
  createMessage.mockClear()
  editMessage.mockClear()
  createMessage.mockResolvedValue('discord-message-1')
  await clearTables()
  fixture = await seedFixture()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

/** Re-imported per test so the module reads the stubbed env at import time. */
async function approvals() {
  return import('@/services/discordApprovals')
}

describe('when Discord is not configured', () => {
  it('publishes nothing at all', async () => {
    const { publishPlayerApproval } = await approvals()

    await publishPlayerApproval(fixture.pendingPlayer.id)

    expect(createMessage).not.toHaveBeenCalled()
    expect(await db.discordApproval.count()).toBe(0)
  })
})

describe('publishPlayerApproval', () => {
  beforeEach(configure)

  it('claims a row and posts exactly one card', async () => {
    const { publishPlayerApproval } = await approvals()

    await publishPlayerApproval(fixture.pendingPlayer.id)

    expect(createMessage).toHaveBeenCalledTimes(1)
    const row = await db.discordApproval.findFirstOrThrow()
    expect(row.kind).toBe(DISCORD_APPROVAL_KINDS.PLAYER)
    expect(row.targetId).toBe(fixture.pendingPlayer.id)
    expect(row.messageId).toBe('discord-message-1')
  })

  it('is a no-op the second time', async () => {
    // The unique claim is what stops a retry or a double hook from posting a
    // second card with live buttons.
    const { publishPlayerApproval } = await approvals()

    await publishPlayerApproval(fixture.pendingPlayer.id)
    await publishPlayerApproval(fixture.pendingPlayer.id)

    expect(createMessage).toHaveBeenCalledTimes(1)
    expect(await db.discordApproval.count()).toBe(1)
  })

  it('does nothing for a target that no longer exists', async () => {
    const { publishPlayerApproval } = await approvals()

    await publishPlayerApproval('does-not-exist')

    expect(createMessage).not.toHaveBeenCalled()
    expect(await db.discordApproval.count()).toBe(0)
  })

  it('swallows a Discord failure instead of propagating it', async () => {
    // A Discord outage must never be able to fail an approval.
    createMessage.mockRejectedValueOnce(new Error('503 from Discord'))
    const { publishPlayerApproval } = await approvals()

    await expect(
      publishPlayerApproval(fixture.pendingPlayer.id),
    ).resolves.toBeUndefined()

    // The claim survives with a null messageId: a lost card, never a duplicate.
    const row = await db.discordApproval.findFirstOrThrow()
    expect(row.messageId).toBeNull()
  })
})

describe('resolvePlayerApproval', () => {
  beforeEach(configure)

  it('edits the card and stamps resolvedAt', async () => {
    const { publishPlayerApproval, resolvePlayerApproval } = await approvals()

    await publishPlayerApproval(fixture.pendingPlayer.id)
    await resolvePlayerApproval(fixture.pendingPlayer.id, {
      approved: true,
      decidedById: fixture.admin.id,
    })

    expect(editMessage).toHaveBeenCalledTimes(1)
    const row = await db.discordApproval.findFirstOrThrow()
    expect(row.resolvedAt).not.toBeNull()
  })

  it('does nothing when no card was ever published', async () => {
    const { resolvePlayerApproval } = await approvals()

    await resolvePlayerApproval(fixture.pendingPlayer.id, {
      approved: true,
      decidedById: fixture.admin.id,
    })

    expect(editMessage).not.toHaveBeenCalled()
  })

  it('does nothing when the card was claimed but never posted', async () => {
    createMessage.mockRejectedValueOnce(new Error('down'))
    const { publishPlayerApproval, resolvePlayerApproval } = await approvals()

    await publishPlayerApproval(fixture.pendingPlayer.id)
    await resolvePlayerApproval(fixture.pendingPlayer.id, {
      approved: true,
      decidedById: fixture.admin.id,
    })

    expect(editMessage).not.toHaveBeenCalled()
  })

  it('leaves the buttons alone when the edit fails', async () => {
    // Safe by design: the next click loses the service's atomic claim and the
    // card self-heals from current state.
    editMessage.mockRejectedValueOnce(new Error('message deleted'))
    const { publishPlayerApproval, resolvePlayerApproval } = await approvals()

    await publishPlayerApproval(fixture.pendingPlayer.id)
    await expect(
      resolvePlayerApproval(fixture.pendingPlayer.id, {
        approved: true,
        decidedById: fixture.admin.id,
      }),
    ).resolves.toBeUndefined()

    const row = await db.discordApproval.findFirstOrThrow()
    expect(row.resolvedAt).toBeNull()
  })
})

describe('publishMatchApproval', () => {
  beforeEach(configure)

  it('posts a card for a match awaiting review', async () => {
    const match = await db.match.create({
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

    const { publishMatchApproval } = await approvals()
    await publishMatchApproval(match.id)

    expect(createMessage).toHaveBeenCalledTimes(1)
    const row = await db.discordApproval.findFirstOrThrow()
    expect(row.kind).toBe(DISCORD_APPROVAL_KINDS.MATCH)
    expect(row.targetId).toBe(match.id)
  })
})
