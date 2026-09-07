import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { GamemodeBadge, WinLossPill } from '@/components/domain/GamemodeBadge'
import { RatingDelta, RatingValue } from '@/components/domain/RatingValue'
import { StatCard } from '@/components/domain/StatCard'
import { TierBadge } from '@/components/domain/TierBadge'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { USER_STATUSES } from '@/domain/constants'
import { resolveTier, winRate } from '@/domain/tiers'
import { getCurrentUser } from '@/lib/auth/session'
import { listTiers } from '@/services/gamemodes'
import { getDashboardSummary } from '@/services/playerMatches'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Dashboard' }

/**
 * Player dashboard.
 *
 * Built to answer two questions immediately (FULL_BUILD §1643): where do I
 * stand, and what should I do next. Anything requiring the player's action is
 * placed above their statistics, because an unanswered confirmation is more
 * urgent than a rating they already know.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const pending = user.status === USER_STATUSES.PENDING
  const suspended = user.status === USER_STATUSES.SUSPENDED

  const [summary, tiers] = await Promise.all([
    getDashboardSummary(user.id),
    listTiers(),
  ])

  const best = summary.ratings[0] ?? null
  const totalWins = summary.ratings.reduce((sum, r) => sum + r.wins, 0)
  const totalLosses = summary.ratings.reduce((sum, r) => sum + r.losses, 0)
  const rate = winRate(totalWins, totalLosses)

  return (
    <PageShell>
      <PageHeader
        eyebrow={`Signed in as ${user.username}`}
        title="Dashboard"
        action={
          !pending && !suspended ? (
            <ButtonLink href="/matches/submit" variant="accent">
              Submit a match
            </ButtonLink>
          ) : null
        }
      />

      {/* Account state comes first when it blocks everything else. */}
      {suspended ? (
        <Card className="mb-8 border-negative/40">
          <div className="p-5">
            <h2 className="font-display text-xl text-negative">
              Your account is suspended
            </h2>
            <p className="mt-2 max-w-prose text-sm text-text-secondary">
              {user.statusReason ??
                'An administrator suspended this account. Contact staff if you believe this is a mistake.'}
            </p>
          </div>
        </Card>
      ) : pending ? (
        <Card className="mb-8 border-warning/40">
          <div className="p-5">
            <h2 className="font-display text-xl text-warning">
              Awaiting approval
            </h2>
            <p className="mt-2 max-w-prose text-sm text-text-secondary">
              An administrator has to approve your registration before you can
              submit matches or appear in the rankings. You can browse
              everything else in the meantime.
            </p>
          </div>
        </Card>
      ) : null}

      {/* What to do next */}
      {summary.awaitingResponse > 0 ? (
        <Card className="mb-8 border-info/40">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="font-display text-xl text-text-primary">
                {summary.awaitingResponse}{' '}
                {summary.awaitingResponse === 1 ? 'match needs' : 'matches need'}{' '}
                your confirmation
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Someone reported a result against you.
              </p>
            </div>
            <ButtonLink href="/matches" variant="primary">
              Review them
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      {/* Where you stand */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Best rating"
          value={best ? best.rating : '—'}
          detail={best ? best.gamemode.name : 'No ranked gamemode yet'}
          tone="accent"
        />
        <StatCard label="Wins" value={totalWins} />
        <StatCard label="Losses" value={totalLosses} />
        <StatCard
          label="Win rate"
          value={rate === null ? '—' : `${rate}%`}
          detail={`${totalWins + totalLosses} matches`}
        />
      </div>

      {summary.ownPending > 0 ? (
        <p className="mt-4 text-sm text-text-secondary">
          You have{' '}
          <Link href="/matches" className="text-accent hover:text-accent-strong">
            {summary.ownPending} submission
            {summary.ownPending === 1 ? '' : 's'} awaiting a decision
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Per-gamemode standing */}
        <Card>
          <CardHeader
            title="Your gamemodes"
            action={
              <Link
                href="/leaderboards"
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Leaderboards →
              </Link>
            }
          />

          {summary.ratings.length === 0 ? (
            <EmptyState
              title="Not ranked yet"
              description="Your first approved match puts you on a ladder."
              action={
                !pending && !suspended ? (
                  <ButtonLink href="/matches/submit" variant="accent">
                    Submit a match
                  </ButtonLink>
                ) : null
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {summary.ratings.map((rating) => (
                <li
                  key={rating.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <GamemodeBadge
                    name={rating.gamemode.name}
                    themeToken={rating.gamemode.themeToken}
                  />
                  <span className="tnum ml-auto text-xs text-text-muted">
                    {rating.wins}W · {rating.losses}L
                  </span>
                  <RatingValue value={rating.rating} size="sm" />
                  <TierBadge
                    tier={resolveTier(rating.rating, tiers)}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent results */}
        <Card>
          <CardHeader
            title="Recent matches"
            action={
              <Link
                href="/matches"
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                All matches →
              </Link>
            }
          />

          {summary.recentMatches.length === 0 ? (
            <EmptyState
              title="No approved matches yet"
              description="Approved results appear here with their rating change."
            />
          ) : (
            <ul className="divide-y divide-line">
              {summary.recentMatches.map((match) => {
                const isSubmitter = match.submitter.id === user.id
                const opponent = isSubmitter ? match.opponent : match.submitter
                const delta = match.ratingHistory[0]?.delta ?? 0

                return (
                  <li
                    key={match.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <WinLossPill won={match.winnerId === user.id} />
                    <Link
                      href={`/players/${opponent.username}`}
                      className="min-w-0 flex-1 truncate text-sm text-text-secondary hover:text-text-primary"
                    >
                      vs {opponent.username}
                    </Link>
                    <GamemodeBadge
                      name={match.gamemode.name}
                      themeToken={match.gamemode.themeToken}
                    />
                    <RatingDelta delta={delta} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
