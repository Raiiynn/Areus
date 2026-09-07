import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GamemodeBadge, WinLossPill } from '@/components/domain/GamemodeBadge'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { RatingDelta, RatingValue } from '@/components/domain/RatingValue'
import { TierBadge } from '@/components/domain/TierBadge'
import { PageShell } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { USER_STATUSES } from '@/domain/constants'
import { resolveTier, winRate } from '@/domain/tiers'
import { listTiers } from '@/services/gamemodes'
import {
  getPlayerByUsername,
  getPlayerMatches,
  getRecentForm,
} from '@/services/players'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const player = await getPlayerByUsername(username)

  if (!player) return { title: 'Player not found' }

  const best = player.ratings[0]

  return {
    title: player.username,
    description: best
      ? `${player.username} is rated ${best.rating} in ${best.gamemode.name} on AREUS.`
      : `${player.username} on AREUS.`,
    openGraph: {
      title: `AREUS — ${player.username}`,
      description: best
        ? `Rated ${best.rating} in ${best.gamemode.name}.`
        : 'AREUS competitor.',
    },
  }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const player = await getPlayerByUsername(username)

  // A suspended or rejected account is not a public profile.
  if (!player || player.status !== USER_STATUSES.APPROVED) notFound()

  const [matches, form, tiers] = await Promise.all([
    getPlayerMatches(player.id, 20),
    getRecentForm(player.id, 5),
    listTiers(),
  ])

  const best = player.ratings[0] ?? null
  const totalWins = player.ratings.reduce((sum, r) => sum + r.wins, 0)
  const totalLosses = player.ratings.reduce((sum, r) => sum + r.losses, 0)
  const overall = winRate(totalWins, totalLosses)

  return (
    <PageShell>
      {/* Identity. On mobile this stacks in the priority order from
          FULL_BUILD §656: avatar, username, rating, tier. */}
      <header className="mb-8 border-b border-line pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PlayerAvatar
            username={player.minecraftUsername}
            size={80}
            className="h-20 w-20"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl text-text-primary">
                {player.username}
              </h1>
              {player.role !== 'PLAYER' ? (
                <Badge tone="accent">{player.role}</Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-text-secondary">
              Playing as{' '}
              <span className="font-mono text-text-primary">
                {player.minecraftUsername}
              </span>{' '}
              · joined{' '}
              <time dateTime={player.createdAt.toISOString()}>
                {player.createdAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            </p>

            {form.length > 0 ? (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xs uppercase tracking-wider text-text-muted">
                  Recent form
                </span>
                <ul className="flex gap-1">
                  {form.map((result, index) => (
                    <li key={index}>
                      <WinLossPill won={result === 'W'} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {best ? (
            <div className="flex items-center gap-4 rounded-md border border-line bg-surface-raised px-5 py-4 sm:flex-col sm:items-end">
              <div className="sm:text-right">
                <p className="text-2xs uppercase tracking-wider text-text-muted">
                  Best rating
                </p>
                <RatingValue value={best.rating} size="xl" />
              </div>
              <TierBadge tier={resolveTier(best.rating, tiers)} size="lg" />
            </div>
          ) : null}
        </div>
      </header>

      {/* Overall */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="px-4 py-3">
          <p className="text-2xs uppercase tracking-wider text-text-muted">
            Wins
          </p>
          <p className="tnum mt-1 font-display text-2xl text-positive">
            {totalWins}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xs uppercase tracking-wider text-text-muted">
            Losses
          </p>
          <p className="tnum mt-1 font-display text-2xl text-negative">
            {totalLosses}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xs uppercase tracking-wider text-text-muted">
            Win rate
          </p>
          <p className="tnum mt-1 font-display text-2xl text-text-primary">
            {overall === null ? '—' : `${overall}%`}
          </p>
        </Card>
      </div>

      {/* Per-gamemode statistics */}
      <section className="mt-8">
        <h2 className="font-display text-2xl text-text-primary">
          Gamemode statistics
        </h2>

        {player.ratings.length === 0 ? (
          <Card className="mt-4">
            <EmptyState
              title="Not ranked yet"
              description={`${player.username} has not completed a reviewed match.`}
            />
          </Card>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {player.ratings.map((rating) => {
              const rate = winRate(rating.wins, rating.losses)
              return (
                <li key={rating.id}>
                  <Card className="h-full p-5">
                    <div className="flex items-start justify-between gap-3">
                      <GamemodeBadge
                        name={rating.gamemode.name}
                        themeToken={rating.gamemode.themeToken}
                      />
                      <TierBadge
                        tier={resolveTier(rating.rating, tiers)}
                        size="sm"
                      />
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <RatingValue value={rating.rating} size="lg" />
                      <span className="tnum text-sm text-text-secondary">
                        {rating.matchesPlayed}{' '}
                        {rating.matchesPlayed === 1 ? 'match' : 'matches'}
                      </span>
                    </div>

                    {/* responsive-ok: W / L / win-rate, single short numbers */}
                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                      <div>
                        <dt className="text-2xs uppercase tracking-wider text-text-muted">
                          W
                        </dt>
                        <dd className="tnum text-positive">{rating.wins}</dd>
                      </div>
                      <div>
                        <dt className="text-2xs uppercase tracking-wider text-text-muted">
                          L
                        </dt>
                        <dd className="tnum text-negative">{rating.losses}</dd>
                      </div>
                      <div>
                        <dt className="text-2xs uppercase tracking-wider text-text-muted">
                          Rate
                        </dt>
                        <dd className="tnum text-text-primary">
                          {rate === null ? '—' : `${rate}%`}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Match history */}
      <section className="mt-8">
        <h2 className="font-display text-2xl text-text-primary">
          Match history
        </h2>

        <Card className="mt-4">
          {matches.length === 0 ? (
            <EmptyState
              title="No matches yet"
              description="Approved matches appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {matches.map((match) => {
                const won = match.winnerId === player.id
                const opponent =
                  match.submitter.id === player.id
                    ? match.opponent
                    : match.submitter
                const delta = match.ratingHistory[0]?.delta ?? 0
                const playerScore =
                  match.submitter.id === player.id
                    ? match.submitterScore
                    : match.opponentScore
                const opponentScore =
                  match.submitter.id === player.id
                    ? match.opponentScore
                    : match.submitterScore

                return (
                  <li
                    key={match.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <WinLossPill won={won} />

                    <GamemodeBadge
                      name={match.gamemode.name}
                      themeToken={match.gamemode.themeToken}
                    />

                    <span className="tnum text-sm text-text-primary">
                      {playerScore}–{opponentScore}
                    </span>

                    <Link
                      href={`/players/${opponent.username}`}
                      className="min-w-0 flex-1 truncate text-sm text-text-secondary transition-colors duration-instant hover:text-text-primary"
                    >
                      vs {opponent.username}
                    </Link>

                    <RatingDelta delta={delta} />

                    {match.reviewedAt ? (
                      <time
                        dateTime={match.reviewedAt.toISOString()}
                        className="tnum w-full text-xs text-text-muted sm:w-auto"
                      >
                        {match.reviewedAt.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </time>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>
    </PageShell>
  )
}
