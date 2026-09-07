import { describe, expect, it } from 'vitest'

import { DISCORD_APPROVAL_KINDS } from '@/domain/constants'
import {
  buildMatchCard,
  buildPlayerCard,
  buildRejectModal,
  buildResolvedMatchCard,
  buildResolvedPlayerCard,
  escapeMarkdown,
  type MatchCardInput,
  type PlayerCardInput,
} from '@/lib/discord/messages'

/**
 * Discord answers an over-long embed with a 400 and the card simply never
 * appears — a silent failure that would look like a broken integration. These
 * assert the documented ceilings hold even for hostile input.
 */

const LIMITS = { embedTotal: 6000, fieldValue: 1024, title: 256, modalTitle: 45 }

const player: PlayerCardInput = {
  id: 'clplayer1',
  username: 'Alice',
  email: 'alice@test.local',
  minecraftUsername: 'Alice',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

const match: MatchCardInput = {
  id: 'clmatch1',
  gamemodeName: 'Sword',
  submitterUsername: 'Alice',
  opponentUsername: 'Bob',
  submitterScore: 3,
  opponentScore: 1,
  winnerIsSubmitter: true,
  headToHead: { wins: 4, losses: 2, total: 6 },
  suspicious: false,
  suspicionReasons: null,
  notes: null,
  opponentConfirmedAt: new Date('2026-01-02T00:00:00Z'),
  hasEvidence: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

function embedSize(embed: {
  title: string
  description?: string
  footer: { text: string }
  fields: Array<{ name: string; value: string }>
}) {
  return (
    embed.title.length +
    (embed.description?.length ?? 0) +
    embed.footer.text.length +
    embed.fields.reduce((t, f) => t + f.name.length + f.value.length, 0)
  )
}

describe('escapeMarkdown', () => {
  it('neutralises formatting in player-supplied text', () => {
    // A username is data, not formatting. Without this a player could pick a
    // name that renders as a heading or a link.
    expect(escapeMarkdown('**bold**')).toBe(String.raw`\*\*bold\*\*`)
    expect(escapeMarkdown('[click](http://evil)')).toContain(String.raw`\[`)
  })
})

describe('player card', () => {
  it('carries approve, reject and a link button', () => {
    const card = buildPlayerCard(player)
    const row = card.components[0]!

    expect(row.components).toHaveLength(3)
    expect(row.components[0]!.custom_id).toContain(DISCORD_APPROVAL_KINDS.PLAYER)
    // Style 5 is a link button: it produces no interaction, which is why the
    // evidence route is safe to point at.
    expect(row.components[2]!.style).toBe(5)
    expect(row.components[2]!.custom_id).toBeUndefined()
  })

  it('drops its buttons once resolved', () => {
    const card = buildResolvedPlayerCard(player, {
      approved: true,
      decidedBy: 'Admin',
    })
    expect(card.components).toEqual([])
  })

  it('records the decision and reason on the resolved card', () => {
    const card = buildResolvedMatchCard(match, {
      approved: false,
      decidedBy: 'Admin',
      reason: 'Scores do not match the screenshot.',
    })
    const values = card.embeds[0]!.fields.map((f) => f.value).join(' ')
    expect(values).toContain('Admin')
    expect(values).toContain('screenshot')
  })
})

describe('match card', () => {
  it('says explicitly that evidence is not attached', () => {
    // A reviewer must not read a missing screenshot as an integration failure
    // when it is the deliberate privacy boundary.
    const withEvidence = buildMatchCard(match)
    const text = withEvidence.embeds[0]!.fields.map((f) => f.value).join(' ')
    expect(text).toContain('not public')

    const without = buildMatchCard({ ...match, hasEvidence: false })
    expect(without.embeds[0]!.fields.map((f) => f.value).join(' ')).toContain(
      'None attached',
    )
  })

  it('flags a suspicious match in the description', () => {
    const card = buildMatchCard({
      ...match,
      suspicious: true,
      suspicionReasons: 'Five matches against the same opponent today.',
    })
    expect(card.embeds[0]!.description).toContain('Flagged')
  })

  it('distinguishes an escalated match from a confirmed one', () => {
    const escalated = buildMatchCard({ ...match, opponentConfirmedAt: null })
    expect(escalated.embeds[0]!.fields.map((f) => f.value).join(' ')).toContain(
      'never responded',
    )
  })

  it('stays inside every Discord ceiling with hostile input', () => {
    const card = buildMatchCard({
      ...match,
      gamemodeName: 'G'.repeat(500),
      submitterUsername: 'S'.repeat(500),
      opponentUsername: 'O'.repeat(500),
      notes: 'N'.repeat(4000),
      suspicious: true,
      suspicionReasons: 'R'.repeat(9000),
    })

    const embed = card.embeds[0]!
    expect(embed.title.length).toBeLessThanOrEqual(LIMITS.title)
    expect(embedSize(embed)).toBeLessThanOrEqual(LIMITS.embedTotal)
    for (const f of embed.fields) {
      expect(f.value.length).toBeLessThanOrEqual(LIMITS.fieldValue)
    }
  })
})

describe('reject modal', () => {
  it('mirrors the schema reason bounds', () => {
    const modal = buildRejectModal(DISCORD_APPROVAL_KINDS.MATCH, 'clmatch1', 'match')
    const input = modal.data.components[0]!.components[0]!

    expect(modal.type).toBe(9)
    expect(input.min_length).toBe(3)
    expect(input.max_length).toBe(500)
    expect(input.custom_id).toBe('reason')
  })

  it('keeps its title inside the 45-character limit', () => {
    const modal = buildRejectModal(
      DISCORD_APPROVAL_KINDS.PLAYER,
      'clplayer1',
      'r'.repeat(200),
    )
    expect(modal.data.title.length).toBeLessThanOrEqual(LIMITS.modalTitle)
  })
})
