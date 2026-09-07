import Link from 'next/link'

import type { TierDefinition } from '@/domain/tiers'
import { resolveTier, winRate } from '@/domain/tiers'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { RatingValue } from '@/components/domain/RatingValue'
import { TierBadge } from '@/components/domain/TierBadge'

/**
 * Leaderboard.
 *
 * Two distinct layouts rather than one squeezed layout (FULL_BUILD §622):
 *
 * - **≥768px** a real table, because comparing players down a column is the
 *   whole point of a ladder and a table does that better than anything else.
 * - **<768px** stacked cards. A seven-column table on a 320px screen is either
 *   unreadable or a horizontal scroll, and §634 requires the critical
 *   information to stay easy to reach.
 *
 * Mobile priority order is rank → player → rating → tier (§636). Wins, losses
 * and win rate drop to a second line rather than being cut.
 */

export interface LeaderboardRow {
  id: string
  rank: number
  rating: number
  wins: number
  losses: number
  user: {
    username: string
    minecraftUsername: string
  }
}

export function LeaderboardTable({
  rows,
  tiers,
}: {
  rows: readonly LeaderboardRow[]
  tiers: readonly TierDefinition[]
}) {
  return (
    <>
      {/* Desktop: real table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Player rankings, highest rating first
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              <Th className="w-16 text-right">Rank</Th>
              <Th>Player</Th>
              <Th className="w-24 text-right">Rating</Th>
              <Th className="w-20 text-center">Tier</Th>
              <Th className="w-20 text-right">Wins</Th>
              <Th className="w-20 text-right">Losses</Th>
              <Th className="w-24 text-right">Win rate</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const rate = winRate(row.wins, row.losses)
              return (
                <tr
                  key={row.id}
                  className="group transition-colors duration-instant hover:bg-surface-overlay"
                >
                  <td className="tnum px-3 py-3 text-right font-display text-text-secondary">
                    {row.rank}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/players/${row.user.username}`}
                      className="flex items-center gap-3 text-text-primary transition-colors duration-instant hover:text-accent"
                    >
                      <PlayerAvatar
                        username={row.user.minecraftUsername}
                        size={28}
                      />
                      <span className="truncate">{row.user.username}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RatingValue value={row.rating} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <TierBadge
                      tier={resolveTier(row.rating, tiers)}
                      size="sm"
                      className="mx-auto"
                    />
                  </td>
                  <td className="tnum px-3 py-3 text-right text-text-secondary">
                    {row.wins}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-text-secondary">
                    {row.losses}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-text-secondary">
                    {rate === null ? '—' : `${rate}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, restructured rather than shrunk */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => {
          const rate = winRate(row.wins, row.losses)
          return (
            <li key={row.id}>
              <Link
                href={`/players/${row.user.username}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-instant hover:bg-surface-overlay"
              >
                <span className="tnum w-6 shrink-0 text-right font-display text-text-secondary">
                  {row.rank}
                </span>

                <PlayerAvatar
                  username={row.user.minecraftUsername}
                  size={36}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-text-primary">
                    {row.user.username}
                  </p>
                  <p className="tnum text-xs text-text-muted">
                    {row.wins}W · {row.losses}L
                    {rate === null ? '' : ` · ${rate}%`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <RatingValue value={row.rating} size="sm" />
                  <TierBadge tier={resolveTier(row.rating, tiers)} size="sm" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-2xs font-medium uppercase tracking-wider text-text-muted ${className ?? ''}`}
    >
      {children}
    </th>
  )
}
