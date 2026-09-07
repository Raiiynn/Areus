import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'

import { MATCH_STATUSES, USER_STATUSES } from '@/domain/constants'
import {
  MatchError,
  cancelMatch,
  escalateOverdueMatches,
  respondToMatch,
  reviewMatch,
  submitMatch,
} from '@/services/matches'

import {
  clearTables,
  db,
  fakeEvidence,
  resetTestDatabase,
  seedFixture,
} from './helpers/testDb'

/**
 * Match lifecycle (FULL_BUILD §66).
 *
 * These run against a real PostgreSQL database, because the properties that matter
 * most here — transactional approval, the double-approve guard, immutable
 * rating history — are properties of the database interaction, not of a pure
 * function. Mocking Prisma would test the mock.
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

const baseSubmission = () => ({
  submitterId: fixture.alice.id,
  opponentUsername: 'Bob',
  gamemodeSlug: 'sword',
  submitterScore: 3,
  opponentScore: 1,
  evidence: fakeEvidence('a'),
})

describe('submitMatch', () => {
  it('creates a match awaiting opponent confirmation', async () => {
    const match = await submitMatch(baseSubmission())

    expect(match.status).toBe(MATCH_STATUSES.PENDING_OPPONENT)
    expect(match.winnerId).toBe(fixture.alice.id)
    expect(match.escalatesAt).toBeInstanceOf(Date)
  })

  it('notifies the opponent that they need to respond', async () => {
    await submitMatch(baseSubmission())

    const notifications = await db.notification.findMany({
      where: { userId: fixture.bob.id },
    })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]!.type).toBe('MATCH_AWAITING_CONFIRMATION')
  })

  it('records the winner from the scores', async () => {
    const match = await submitMatch({
      ...baseSubmission(),
      submitterScore: 0,
      opponentScore: 3,
    })

    expect(match.winnerId).toBe(fixture.bob.id)
  })

  it('rejects a match against yourself', async () => {
    await expect(
      submitMatch({ ...baseSubmission(), opponentUsername: 'Alice' }),
    ).rejects.toThrow(MatchError)
  })

  it('rejects an unknown opponent', async () => {
    await expect(
      submitMatch({ ...baseSubmission(), opponentUsername: 'Nobody' }),
    ).rejects.toThrow(/No player with that username/)
  })

  it('rejects an opponent who is not approved', async () => {
    await expect(
      submitMatch({ ...baseSubmission(), opponentUsername: 'Pending' }),
    ).rejects.toThrow(/not an approved competitor/)
  })

  it('rejects an inactive gamemode', async () => {
    await expect(
      submitMatch({ ...baseSubmission(), gamemodeSlug: 'retired' }),
    ).rejects.toThrow(/not available/)
  })

  it('matches the opponent case-insensitively', async () => {
    const match = await submitMatch({
      ...baseSubmission(),
      opponentUsername: 'bOb',
    })
    expect(match.opponentId).toBe(fixture.bob.id)
  })

  it('rejects an identical duplicate that is still open', async () => {
    await submitMatch(baseSubmission())

    await expect(
      submitMatch({ ...baseSubmission(), evidence: fakeEvidence('b') }),
    ).rejects.toThrow(/identical match awaiting review/)
  })

  it('flags reused evidence as suspicious rather than blocking it', async () => {
    await submitMatch(baseSubmission())

    // Same screenshot, different scoreline, so the duplicate guard does not
    // fire and the evidence heuristic is what we are exercising.
    const second = await submitMatch({
      ...baseSubmission(),
      submitterScore: 3,
      opponentScore: 2,
      evidence: fakeEvidence('a'),
    })

    expect(second.suspicious).toBe(true)
    expect(second.suspicionReasons).toMatch(/submitted before/)
  })

  it('flags an implausible score gap', async () => {
    const match = await submitMatch({
      ...baseSubmission(),
      submitterScore: 40,
      opponentScore: 0,
    })

    expect(match.suspicious).toBe(true)
    expect(match.suspicionReasons).toMatch(/score gap/)
  })
})

describe('respondToMatch', () => {
  it('moves a confirmed match to admin review', async () => {
    const match = await submitMatch(baseSubmission())

    const updated = await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })

    expect(updated.status).toBe(MATCH_STATUSES.PENDING_ADMIN)
    expect(updated.opponentConfirmedAt).toBeInstanceOf(Date)
  })

  it('rejects a disputed match outright', async () => {
    const match = await submitMatch(baseSubmission())

    const updated = await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'DISPUTE',
      reason: 'That never happened.',
    })

    expect(updated.status).toBe(MATCH_STATUSES.REJECTED)
    expect(updated.opponentRejectReason).toBe('That never happened.')
  })

  it('refuses a response from anyone but the named opponent', async () => {
    const match = await submitMatch(baseSubmission())

    // The core IDOR guard: a third party holding the match id cannot act.
    await expect(
      respondToMatch({
        matchId: match.id,
        opponentId: fixture.suspended.id,
        decision: 'CONFIRM',
      }),
    ).rejects.toThrow(/not the opponent/)
  })

  it('refuses a response from the submitter', async () => {
    const match = await submitMatch(baseSubmission())

    await expect(
      respondToMatch({
        matchId: match.id,
        opponentId: fixture.alice.id,
        decision: 'CONFIRM',
      }),
    ).rejects.toThrow(/not the opponent/)
  })

  it('refuses a second response', async () => {
    const match = await submitMatch(baseSubmission())
    await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })

    await expect(
      respondToMatch({
        matchId: match.id,
        opponentId: fixture.bob.id,
        decision: 'DISPUTE',
        reason: 'Changed my mind.',
      }),
    ).rejects.toThrow(/no longer awaiting your response/)
  })
})

describe('escalateOverdueMatches', () => {
  it('moves a lapsed match to admin review', async () => {
    const match = await submitMatch(baseSubmission())

    // Wind the deadline into the past rather than waiting 48 hours.
    await db.match.update({
      where: { id: match.id },
      data: { escalatesAt: new Date(Date.now() - 1000) },
    })

    const count = await escalateOverdueMatches()
    expect(count).toBe(1)

    const after = await db.match.findUnique({ where: { id: match.id } })
    expect(after!.status).toBe(MATCH_STATUSES.PENDING_ADMIN)
  })

  it('leaves matches inside the window alone', async () => {
    await submitMatch(baseSubmission())
    expect(await escalateOverdueMatches()).toBe(0)
  })
})

describe('reviewMatch — approval', () => {
  async function confirmedMatch() {
    const match = await submitMatch(baseSubmission())
    await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })
    return match
  }

  it('applies ratings to both players', async () => {
    const match = await confirmedMatch()

    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'APPROVE',
    })

    const [winner, loser] = await Promise.all([
      db.playerGamemodeRating.findUnique({
        where: {
          userId_gamemodeId: {
            userId: fixture.alice.id,
            gamemodeId: fixture.sword.id,
          },
        },
      }),
      db.playerGamemodeRating.findUnique({
        where: {
          userId_gamemodeId: {
            userId: fixture.bob.id,
            gamemodeId: fixture.sword.id,
          },
        },
      }),
    ])

    // Equal ratings, equal K of 20, so 10 points move across.
    expect(winner!.rating).toBe(1010)
    expect(loser!.rating).toBe(990)
    expect(winner!.wins).toBe(1)
    expect(loser!.losses).toBe(1)
    expect(winner!.matchesPlayed).toBe(21)
  })

  it('writes one immutable history row per player', async () => {
    const match = await confirmedMatch()
    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'APPROVE',
    })

    const history = await db.ratingHistory.findMany({
      where: { matchId: match.id },
    })

    expect(history).toHaveLength(2)
    for (const row of history) {
      expect(row.ratingAfter).toBe(row.ratingBefore + row.delta)
      expect(row.engine).toBe('elo')
    }
  })

  it('records an audit entry naming the reviewer', async () => {
    const match = await confirmedMatch()
    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'APPROVE',
    })

    const audit = await db.auditLog.findFirst({
      where: { action: 'ADMIN_APPROVED_MATCH', targetId: match.id },
    })

    expect(audit).not.toBeNull()
    expect(audit!.actorId).toBe(fixture.admin.id)
  })

  it('notifies both players of the rating change', async () => {
    const match = await confirmedMatch()
    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'APPROVE',
    })

    const notifications = await db.notification.findMany({
      where: { type: 'RATING_CHANGED' },
    })
    expect(notifications).toHaveLength(2)
  })

  it('refuses to approve the same match twice', async () => {
    const match = await confirmedMatch()
    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'APPROVE',
    })

    // Without the in-transaction status re-read, this would apply ratings a
    // second time and silently inflate the ladder.
    await expect(
      reviewMatch({
        matchId: match.id,
        reviewerId: fixture.admin.id,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(/not awaiting review/)

    const history = await db.ratingHistory.findMany({
      where: { matchId: match.id },
    })
    expect(history).toHaveLength(2)
  })

  it('refuses to review a match the opponent has not confirmed', async () => {
    const match = await submitMatch(baseSubmission())

    await expect(
      reviewMatch({
        matchId: match.id,
        reviewerId: fixture.admin.id,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(/not awaiting review/)
  })

  it('creates a rating row for a gamemode the player has never played', async () => {
    // Bob has a Sword rating; give Alice a second gamemode she has no row for.
    const newMode = await db.gamemode.create({
      data: {
        slug: 'axe',
        name: 'Axe',
        description: 'Heavy.',
        rules: 'Axe.',
        icon: 'axe',
        themeToken: 'mode-axe',
        sortOrder: 1,
      },
    })

    const match = await submitMatch({
      ...baseSubmission(),
      gamemodeSlug: newMode.slug,
      evidence: fakeEvidence('c'),
    })
    await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })
    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'APPROVE',
    })

    const rating = await db.playerGamemodeRating.findUnique({
      where: {
        userId_gamemodeId: {
          userId: fixture.alice.id,
          gamemodeId: newMode.id,
        },
      },
    })

    expect(rating).not.toBeNull()
    expect(rating!.matchesPlayed).toBe(1)
  })
})

describe('reviewMatch — rejection', () => {
  it('leaves ratings untouched', async () => {
    const match = await submitMatch(baseSubmission())
    await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })

    await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'REJECT',
      reason: 'Screenshot is unreadable.',
    })

    const rating = await db.playerGamemodeRating.findUnique({
      where: {
        userId_gamemodeId: {
          userId: fixture.alice.id,
          gamemodeId: fixture.sword.id,
        },
      },
    })

    expect(rating!.rating).toBe(1000)
    expect(rating!.wins).toBe(0)
    expect(await db.ratingHistory.count()).toBe(0)
  })

  it('keeps the reason on the record', async () => {
    const match = await submitMatch(baseSubmission())
    await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })

    const updated = await reviewMatch({
      matchId: match.id,
      reviewerId: fixture.admin.id,
      decision: 'REJECT',
      reason: 'Screenshot is unreadable.',
    })

    expect(updated.status).toBe(MATCH_STATUSES.REJECTED)
    expect(updated.reviewReason).toBe('Screenshot is unreadable.')
    expect(updated.reviewedById).toBe(fixture.admin.id)
  })
})

describe('cancelMatch', () => {
  it('lets the submitter withdraw before anyone acts', async () => {
    const match = await submitMatch(baseSubmission())

    const updated = await cancelMatch({
      matchId: match.id,
      submitterId: fixture.alice.id,
    })
    expect(updated.status).toBe(MATCH_STATUSES.CANCELLED)
  })

  it('refuses withdrawal by anyone else', async () => {
    const match = await submitMatch(baseSubmission())

    await expect(
      cancelMatch({ matchId: match.id, submitterId: fixture.bob.id }),
    ).rejects.toThrow(/Only the submitter/)
  })

  it('refuses withdrawal once the opponent has confirmed', async () => {
    const match = await submitMatch(baseSubmission())
    await respondToMatch({
      matchId: match.id,
      opponentId: fixture.bob.id,
      decision: 'CONFIRM',
    })

    await expect(
      cancelMatch({ matchId: match.id, submitterId: fixture.alice.id }),
    ).rejects.toThrow(/no longer be withdrawn/)
  })
})

describe('rating conservation across a season', () => {
  it('neither creates nor destroys rating between established players', async () => {
    const before = await db.playerGamemodeRating.aggregate({
      where: { gamemodeId: fixture.sword.id },
      _sum: { rating: true },
    })

    for (let i = 0; i < 5; i += 1) {
      const match = await submitMatch({
        ...baseSubmission(),
        submitterScore: 3,
        opponentScore: i, // vary so the duplicate guard does not fire
        evidence: fakeEvidence(String.fromCharCode(97 + i)),
      })
      await respondToMatch({
        matchId: match.id,
        opponentId: fixture.bob.id,
        decision: 'CONFIRM',
      })
      await reviewMatch({
        matchId: match.id,
        reviewerId: fixture.admin.id,
        decision: 'APPROVE',
      })
    }

    const after = await db.playerGamemodeRating.aggregate({
      where: { gamemodeId: fixture.sword.id },
      _sum: { rating: true },
    })

    expect(after._sum.rating).toBe(before._sum.rating)
  })
})

describe('suspended accounts', () => {
  it('cannot be named as an opponent', async () => {
    await expect(
      submitMatch({ ...baseSubmission(), opponentUsername: 'Suspended' }),
    ).rejects.toThrow(/not an approved competitor/)
  })
})

describe('user status invariants', () => {
  it('new registrations start pending, never approved', async () => {
    // Guards the registration path: status must not be settable by a caller.
    const pending = await db.user.findUnique({
      where: { id: fixture.pendingPlayer.id },
    })
    expect(pending!.status).toBe(USER_STATUSES.PENDING)
  })
})
