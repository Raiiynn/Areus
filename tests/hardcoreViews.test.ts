import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SurvivalLeaderboard } from '@/components/hardcore/SurvivalLeaderboard'
import { SurvivorProfile } from '@/components/hardcore/SurvivorProfile'
import { FactionDirectory } from '@/components/hardcore/FactionDirectory'
import type { Faction, Survivor } from '@/domain/hardcore'

const player: Survivor = {
  uuid: '00000000-0000-0000-0000-000000000001',
  username: 'TestOnly',
  edition: 'Bedrock',
  seasonId: 'fixture-season',
  factionId: 'fixture-faction',
  factionName: 'Test faction',
  kills: 2,
  deaths: 0,
  playtimeMinutes: 61,
  longestSurvivalMinutes: 61,
  survivalMinutes: 61,
  deathBanCount: 0,
  achievements: [],
}
const faction: Faction = {
  id: 'fixture-faction',
  name: 'Test faction',
  tag: 'TEST',
  description: 'Test fixture only',
  leaderUuid: player.uuid,
  memberUuids: [player.uuid],
  kills: null,
  deaths: null,
  power: null,
  territory: null,
  warWins: null,
  warLosses: null,
  survivalMinutesPerMember: null,
  achievements: [],
}

describe('SMP public view contracts', () => {
  it('renders UUID profile links, edition and deathless statistics', () => {
    const html = renderToStaticMarkup(
      createElement(SurvivalLeaderboard, {
        players: [player],
        seasons: [{ id: 'fixture-season', name: 'Test season' }],
      }),
    )
    expect(html).toContain(`/players/${player.uuid}`)
    expect(html).toContain('Bedrock')
    expect(html).toContain('Deathless')
    expect(html).toContain('1h 1m')
    expect(html).toContain('DeathBans')
    expect(html).not.toContain('Infinity')
  })
  it('renders a truthful empty board and unavailable season control', () => {
    const html = renderToStaticMarkup(
      createElement(SurvivalLeaderboard, { players: [], seasons: [] }),
    )
    expect(html).toContain('Survival rankings are not available yet')
    expect(html).toContain('No verified seasons available')
    expect(html).toContain('disabled')
  })
  it('escapes names and keeps profile history unavailable without samples', () => {
    const html = renderToStaticMarkup(
      createElement(SurvivorProfile, {
        player: { ...player, username: '<script>test-only</script>' },
        deaths: [],
      }),
    )
    expect(html).not.toContain('<script>test-only</script>')
    expect(html).toContain('&lt;script&gt;test-only&lt;/script&gt;')
    expect(html).toContain('History unavailable')
    expect(html).toContain('No active ban is inferred')
  })
  it('shows authoritative recorded death timestamps without fabricating an active ban', () => {
    const html = renderToStaticMarkup(
      createElement(SurvivorProfile, {
        player,
        deaths: [
          {
            id: 'test-event',
            playerUuid: player.uuid,
            username: player.username,
            cause: 'Fixture cause',
            factionName: null,
            occurredAt: '2026-01-01T00:00:00.000Z',
            deathBanExpiresAt: '2026-01-01T00:30:00.000Z',
          },
        ],
      }),
    )
    expect(html).toContain('Recorded DeathBan expiry')
    expect(html).toContain('2026-01-01T00:30:00.000Z')
    expect(html).not.toContain('minutes remaining')
  })
  it('keeps a real faction visible but unranked when plugin statistics are missing', () => {
    const html = renderToStaticMarkup(
      createElement(FactionDirectory, {
        factions: [faction],
        players: [player],
      }),
    )
    expect(html).toContain('/factions/fixture-faction')
    expect(html).toContain('Unranked')
    expect(html).toContain('Unavailable')
    expect(html).toContain('TestOnly')
  })
})
