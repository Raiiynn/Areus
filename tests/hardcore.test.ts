import { describe, expect, it } from 'vitest'
import {
  filterSurvivors,
  formatDuration,
  formatRatio,
  killDeathRatio,
  isMinecraftUuid,
  rankFactions,
  SMP_PAGE_SIZE,
  type Faction,
  type Survivor,
} from '@/domain/hardcore'
import { getHardcoreSnapshot } from '@/services/hardcore'

// Fictional fixtures stay in tests; none are shipped as public season records.
const survivor = (overrides: Partial<Survivor> = {}): Survivor => ({
  uuid: '00000000-0000-0000-0000-000000000001',
  username: 'Fixture',
  edition: null,
  seasonId: 'test-season',
  factionId: null,
  factionName: null,
  kills: 0,
  deaths: 0,
  playtimeMinutes: 0,
  longestSurvivalMinutes: 0,
  survivalMinutes: 0,
  deathBanCount: 0,
  achievements: [],
  ...overrides,
})
const faction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 'fixture',
  name: 'Fixture',
  tag: 'TEST',
  description: 'Test only',
  leaderUuid: 'test-member',
  memberUuids: ['test-member'],
  kills: 10,
  deaths: 2,
  power: null,
  territory: 5,
  warWins: 2,
  warLosses: 1,
  survivalMinutesPerMember: 500,
  achievements: [],
  ...overrides,
})

describe('SMP availability and privacy', () => {
  it('only treats canonical UUID paths as verified identity identifiers', () => {
    expect(isMinecraftUuid('00000000-0000-0000-0000-000000000001')).toBe(true)
    expect(isMinecraftUuid('AABBCCDD-0000-0000-0000-000000000001')).toBe(true)
    expect(isMinecraftUuid('SomeUsername')).toBe(false)
    expect(isMinecraftUuid('../private')).toBe(false)
    expect(isMinecraftUuid('00000000000000000000000000000001')).toBe(false)
  })
  it('does not simulate an online server, live season or production records', async () => {
    const snapshot = await getHardcoreSnapshot()
    expect(snapshot.availability).toBe('unavailable')
    expect(snapshot.serverStatus).toBe('unknown')
    expect(snapshot.season).toBeNull()
    expect(snapshot.registeredPlayers).toBeNull()
    expect(snapshot.activeFactionCount).toBeNull()
    expect(snapshot.totalDeaths).toBeNull()
    expect(snapshot.totalPlaytimeMinutes).toBeNull()
    expect(snapshot.players).toEqual([])
    expect(snapshot.factions).toEqual([])
    expect(snapshot.events).toEqual([])
    expect(snapshot.deaths).toEqual([])
    expect(Object.keys(snapshot)).not.toContain('serverIp')
    expect(Object.keys(snapshot)).not.toContain('token')
  })
})

describe('survival rankings', () => {
  it('ranks survival above kills by default without mutating input', () => {
    const players = [
      survivor({ uuid: 'a', kills: 100, survivalMinutes: 10 }),
      survivor({ uuid: 'b', survivalMinutes: 100 }),
    ]
    expect(filterSurvivors(players, '', 'survivors', '', 1).rows[0]?.uuid).toBe(
      'b',
    )
    expect(players[0]?.uuid).toBe('a')
  })
  it.each([
    ['kills', { kills: 1 }],
    ['deaths', { deaths: 1 }],
    ['longest', { longestSurvivalMinutes: 1 }],
    ['active', { playtimeMinutes: 1 }],
    ['kd', { kills: 10, deaths: 1 }],
  ] as const)('supports %s category', (category, metric) => {
    expect(
      filterSurvivors(
        [survivor({ uuid: 'a' }), survivor({ uuid: 'b', ...metric })],
        '',
        category,
        '',
        1,
      ).rows[0]?.uuid,
    ).toBe('b')
  })
  it('filters season and case-insensitive unicode player or faction names', () => {
    const players = [
      survivor({ username: 'Éclair', factionName: 'Guardians' }),
      survivor({ uuid: 'b', seasonId: 'old' }),
    ]
    expect(
      filterSurvivors(players, ' ÉCLAIR ', 'survivors', 'test-season', 1).total,
    ).toBe(1)
    expect(filterSurvivors(players, 'guard', 'survivors', '', 1).total).toBe(1)
    expect(filterSurvivors(players, 'missing', 'survivors', '', 1).total).toBe(
      0,
    )
  })
  it('paginates, clamps invalid page input, and breaks ties by stable identity', () => {
    const players = Array.from({ length: SMP_PAGE_SIZE + 1 }, (_, index) =>
      survivor({ uuid: String(index).padStart(3, '0') }),
    )
    expect(filterSurvivors(players, '', 'survivors', '', 2).rows).toHaveLength(
      1,
    )
    expect(filterSurvivors(players, '', 'survivors', '', Infinity).page).toBe(1)
    expect(filterSurvivors(players, '', 'survivors', '', 999).page).toBe(2)
    expect(filterSurvivors([], '', 'survivors', '', -1).pageCount).toBe(1)
    expect(
      filterSurvivors(
        [survivor({ uuid: 'b' }), survivor({ uuid: 'a' })],
        '',
        'survivors',
        '',
        1,
      ).rows[0]?.uuid,
    ).toBe('a')
  })
  it('keeps two deathless records stably ordered without Infinity subtraction', () => {
    expect(
      filterSurvivors(
        [survivor({ uuid: 'b', kills: 2 }), survivor({ uuid: 'a', kills: 1 })],
        '',
        'kd',
        '',
        1,
      ).rows.map((player) => player.uuid),
    ).toEqual(['a', 'b'])
  })
  it('handles zero deaths, zero kills, unknown metrics and readable durations', () => {
    expect(killDeathRatio(0, 0)).toBe(0)
    expect(killDeathRatio(5, 0)).toBe(Infinity)
    expect(formatRatio(5, 0)).toBe('Deathless')
    expect(formatRatio(0, 0)).toBe('0.00')
    expect(formatRatio(5, 2)).toBe('2.50')
    expect(formatRatio(null, 2)).toBe('Unavailable')
    expect(formatDuration(0)).toBe('0h 0m')
    expect(formatDuration(1501)).toBe('1d 1h')
  })
})

describe('proposed faction ranking', () => {
  it('does not rank incomplete data or factions without members', () => {
    expect(
      rankFactions([
        faction({ territory: null }),
        faction({ memberUuids: [] }),
      ]),
    ).toEqual([])
    expect(rankFactions([])).toEqual([])
    expect(
      rankFactions([
        faction({ kills: NaN }),
        faction({ territory: -1 }),
        faction({ deaths: Infinity }),
      ]),
    ).toEqual([])
  })
  it('keeps identical per-member performance neutral across different faction sizes', () => {
    const small = faction({ id: 'small', kills: 10, deaths: 2 })
    const large = faction({
      id: 'large',
      memberUuids: ['a', 'b'],
      kills: 20,
      deaths: 4,
    })
    const ranked = rankFactions([small, large])
    expect(ranked[0]?.score).toBe(ranked[1]?.score)
    expect(ranked.every((row) => Number.isFinite(row.score))).toBe(true)
  })
  it('normalizes categories before applying proposed weights', () => {
    const pvp = faction({
      id: 'pvp',
      kills: 100,
      territory: 0,
      warWins: 0,
      survivalMinutesPerMember: 0,
    })
    const balanced = faction({
      id: 'balanced',
      kills: 0,
      territory: 1_000_000,
      warWins: 10,
      survivalMinutesPerMember: 100,
    })
    const result = rankFactions([pvp, balanced])
    expect(result[0]?.faction.id).toBe('balanced')
    expect(result[0]?.score).toBeCloseTo(65)
    expect(result[1]?.score).toBeCloseTo(35)
  })
  it('supports configurable valid weights and rejects invalid weights', () => {
    const factions = [
      faction({ id: 'a', kills: 0 }),
      faction({ id: 'b', kills: 100 }),
    ]
    expect(
      rankFactions(factions, { pvp: 1, wars: 0, survival: 0, territory: 0 })[0]
        ?.faction.id,
    ).toBe('b')
    expect(() =>
      rankFactions(factions, { pvp: -1, wars: 1, survival: 1, territory: 0 }),
    ).toThrow()
    expect(() =>
      rankFactions(factions, { pvp: NaN, wars: 1, survival: 0, territory: 0 }),
    ).toThrow()
    expect(() =>
      rankFactions(factions, { pvp: 1, wars: 1, survival: 0, territory: 0 }),
    ).toThrow()
  })
})
