'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { Button } from '@/components/ui/Button'
import { Unavailable } from './Portal'
import {
  filterSurvivors,
  formatDuration,
  formatRatio,
  SURVIVAL_CATEGORIES,
  type Survivor,
  type SurvivalCategory,
} from '@/domain/hardcore'

export function SurvivalLeaderboard({
  players,
  seasons,
  initialCategory = 'survivors',
}: {
  players: Survivor[]
  seasons: Array<{ id: string; name: string }>
  initialCategory?: SurvivalCategory
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SurvivalCategory>(initialCategory)
  const [season, setSeason] = useState(seasons[0]?.id ?? '')
  const [page, setPage] = useState(1)
  const result = filterSurvivors(players, query, category, season, page)
  return (
    <section className="space-y-5" aria-label="Player leaderboard">
      <h2 className="sr-only">Player rankings</h2>
      <div className="flex flex-wrap gap-2" aria-label="Ranking category">
        {Object.entries(SURVIVAL_CATEGORIES).map(([key, label]) => (
          <Button
            key={key}
            variant={category === key ? 'accent' : 'ghost'}
            aria-pressed={category === key}
            onClick={() => {
              setCategory(key as SurvivalCategory)
              setPage(1)
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs text-text-secondary">
          Search player or faction
          <input
            className="smp-filter"
            type="search"
            maxLength={80}
            placeholder="Search the survivors…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-text-secondary">
          Season
          <select
            className="smp-filter"
            value={season}
            onChange={(event) => {
              setSeason(event.target.value)
              setPage(1)
            }}
            disabled={!seasons.length}
          >
            <option value="">
              {seasons.length ? 'All seasons' : 'No verified seasons available'}
            </option>
            {seasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="smp-panel">
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Survival statistics table, scroll horizontally for more statistics"
        >
          <table className="smp-table">
            <caption className="sr-only">
              {SURVIVAL_CATEGORIES[category]} — {result.total} results
            </caption>
            <thead>
              <tr>
                {[
                  'Rank',
                  'Player',
                  'Faction',
                  'Kills',
                  'Deaths',
                  'K/D',
                  'Playtime',
                  'Longest survival',
                  'Current streak',
                  'DeathBans',
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((player, index) => (
                <tr key={`${player.seasonId}:${player.uuid}`}>
                  <td>{result.offset + index + 1}</td>
                  <th scope="row">
                    <Link
                      href={`/players/${player.uuid}`}
                      className="flex min-h-11 items-center gap-3 text-text-primary hover:text-accent-strong"
                    >
                      <PlayerAvatar username={player.uuid} size={32} />
                      {player.username}
                      <span className="text-xs text-text-secondary">
                        {player.edition ?? 'Edition unverified'}
                      </span>
                    </Link>
                  </th>
                  <td>
                    {player.factionId ? (
                      <Link
                        className="text-accent-strong"
                        href={`/factions/${player.factionId}`}
                      >
                        {player.factionName}
                      </Link>
                    ) : (
                      'Unaffiliated'
                    )}
                  </td>
                  <td>{player.kills}</td>
                  <td>{player.deaths}</td>
                  <td>{formatRatio(player.kills, player.deaths)}</td>
                  <td>{formatDuration(player.playtimeMinutes)}</td>
                  <td>{formatDuration(player.longestSurvivalMinutes)}</td>
                  <td>{formatDuration(player.survivalMinutes)}</td>
                  <td>{player.deathBanCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result.rows.length && (
          <Unavailable
            title={
              query
                ? 'No survivors match your search'
                : 'Survival rankings are not available yet'
            }
            description={
              query
                ? 'Try another player or faction name, or clear the search.'
                : 'Verified UUID identities and season statistics are needed before players can be ranked.'
            }
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
          <p aria-live="polite" className="text-xs text-text-secondary">
            {result.total} results · Page {result.page} of {result.pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={result.page <= 1}
              onClick={() => setPage(result.page - 1)}
            >
              Previous
            </Button>
            <Button
              disabled={result.page >= result.pageCount}
              onClick={() => setPage(result.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        Top survivors ranks by current survival streak. A deathless K/D is shown
        as “Deathless”; an untouched 0/0 record is 0.00. PvP match ratings are
        kept separately.
      </p>
    </section>
  )
}
