'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Unavailable } from './Portal'
import {
  formatRatio,
  rankFactions,
  SMP_PAGE_SIZE,
  type Faction,
  type Survivor,
} from '@/domain/hardcore'

export function FactionDirectory({
  factions,
  players,
}: {
  factions: Faction[]
  players: Survivor[]
}) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'directory' | 'rankings'>('directory')
  const [page, setPage] = useState(1)
  const ranked = rankFactions(factions)
  const order = new Map(ranked.map((row, index) => [row.faction.id, index]))
  const matching = factions
    .filter((faction) =>
      `${faction.name} ${faction.tag}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      view === 'rankings'
        ? (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) ||
          a.id.localeCompare(b.id)
        : a.name.localeCompare(b.name),
    )
  const pageCount = Math.max(1, Math.ceil(matching.length / SMP_PAGE_SIZE))
  const rows = matching.slice((page - 1) * SMP_PAGE_SIZE, page * SMP_PAGE_SIZE)
  return (
    <section className="space-y-5" aria-label="Faction directory and rankings">
      <h2 className="sr-only">Faction directory</h2>
      <div className="flex flex-wrap gap-3">
        <Button
          aria-pressed={view === 'directory'}
          variant={view === 'directory' ? 'accent' : 'ghost'}
          onClick={() => setView('directory')}
        >
          Directory
        </Button>
        <Button
          aria-pressed={view === 'rankings'}
          variant={view === 'rankings' ? 'accent' : 'ghost'}
          onClick={() => setView('rankings')}
        >
          Faction rankings
        </Button>
      </div>
      <label className="flex flex-col gap-2 text-xs text-text-secondary">
        Search faction name or tag
        <input
          type="search"
          maxLength={80}
          className="smp-filter"
          placeholder="Find your faction…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
        />
      </label>
      {view === 'directory' ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((faction) => {
            const rank = ranked.findIndex(
              (item) => item.faction.id === faction.id,
            )
            return (
              <li key={faction.id} className="smp-panel p-5">
                <span
                  aria-hidden="true"
                  className="text-3xl text-accent-strong"
                >
                  ◇
                </span>
                <p className="mt-4 text-xs text-accent-strong">
                  [{faction.tag}] · {rank < 0 ? 'Unranked' : `#${rank + 1}`}
                </p>
                <h2 className="mt-2 font-display text-xl">
                  <Link
                    href={`/factions/${faction.id}`}
                    className="inline-flex min-h-11 items-center hover:text-accent-strong"
                  >
                    {faction.name}
                  </Link>
                </h2>
                <p className="mt-3 text-sm text-text-secondary">
                  {faction.description}
                </p>
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-secondary">Leader</dt>
                    <dd>
                      {players.find(
                        (player) => player.uuid === faction.leaderUuid,
                      )?.username ?? 'Unavailable'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Members</dt>
                    <dd>{faction.memberUuids.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Power</dt>
                    <dd>{faction.power ?? 'Unavailable'}</dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="smp-panel">
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Faction statistics, scroll horizontally"
          >
            <table className="smp-table">
              <caption className="sr-only">Proposed faction rankings</caption>
              <thead>
                <tr>
                  {[
                    'Rank',
                    'Faction',
                    'Leader',
                    'Members',
                    'Kills',
                    'Deaths',
                    'K/D',
                    'Power',
                    'Territory',
                    'War wins',
                    'War losses',
                    'Proposed score',
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((faction) => {
                  const rank = ranked.findIndex(
                    (row) => row.faction.id === faction.id,
                  )
                  return (
                    <tr key={faction.id}>
                      <td>{rank < 0 ? 'Unranked' : rank + 1}</td>
                      <th scope="row">
                        <Link
                          href={`/factions/${faction.id}`}
                          className="inline-flex min-h-11 items-center text-accent-strong"
                        >
                          [{faction.tag}] {faction.name}
                        </Link>
                      </th>
                      <td>
                        {players.find(
                          (player) => player.uuid === faction.leaderUuid,
                        )?.username ?? 'Unavailable'}
                      </td>
                      <td>{faction.memberUuids.length}</td>
                      <td>{faction.kills ?? 'Unavailable'}</td>
                      <td>{faction.deaths ?? 'Unavailable'}</td>
                      <td>{formatRatio(faction.kills, faction.deaths)}</td>
                      <td>{faction.power ?? 'Unavailable'}</td>
                      <td>{faction.territory ?? 'Unavailable'}</td>
                      <td>{faction.warWins ?? 'Unavailable'}</td>
                      <td>{faction.warLosses ?? 'Unavailable'}</td>
                      <td>{ranked[rank]?.score.toFixed(1) ?? 'Unavailable'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!rows.length && (
        <div className="smp-panel">
          <Unavailable
            title={
              query
                ? 'No factions match your search'
                : 'Every great faction starts somewhere'
            }
            description={
              query
                ? 'Try another faction name or clear your search.'
                : 'The directory will open when verified faction records arrive. Power, territory and wars remain unavailable until provided by the server.'
            }
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-text-secondary">
          {matching.length} factions · Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  )
}
