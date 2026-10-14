import 'server-only'
import type {
  DeathEvent,
  Faction,
  SeasonEvent,
  Survivor,
} from '@/domain/hardcore'

export interface HardcoreSnapshot {
  availability: 'unavailable' | 'ready'
  updatedAt: string | null
  season: {
    id: string
    name: string
    startsAt: string | null
    endsAt: string | null
  } | null
  serverStatus: 'online' | 'offline' | 'unknown'
  registeredPlayers: number | null
  activeFactionCount: number | null
  totalDeaths: number | null
  totalPlaytimeMinutes: number | null
  players: Survivor[]
  factions: Faction[]
  deaths: DeathEvent[]
  events: SeasonEvent[]
}

/** No SMP source exists yet. Empty arrays are unavailable data, not mock records. */
export async function getHardcoreSnapshot(): Promise<HardcoreSnapshot> {
  return {
    availability: 'unavailable',
    updatedAt: null,
    season: null,
    serverStatus: 'unknown',
    registeredPlayers: null,
    activeFactionCount: null,
    totalDeaths: null,
    totalPlaytimeMinutes: null,
    players: [],
    factions: [],
    deaths: [],
    events: [],
  }
}
