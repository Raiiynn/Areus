import type { Metadata } from 'next'
import Link from 'next/link'

import { MatchReviewForm } from '@/components/admin/MatchReviewForm'
import { GamemodeBadge } from '@/components/domain/GamemodeBadge'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { listMatchesForReview } from '@/services/admin'
import { getHeadToHead } from '@/services/players'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Match review' }

export default async function AdminMatchesPage() {
  const matches = await listMatchesForReview()

  // Head-to-head gives the reviewer context: a player who has beaten the same
  // opponent nine times this week looks different from a first meeting.
  const withContext = await Promise.all(
    matches.map(async (match) => ({
      match,
      headToHead: await getHeadToHead(match.submitter.id, match.opponent.id),
    })),
  )

  return (
    <PageShell>
      <PageHeader
        title="Match review"
        description="Approve only what the evidence supports. Rejecting always requires a reason."
      />

      {withContext.length === 0 ? (
        <Card>
          <EmptyState
            title="No pending submissions"
            description="Matches appear here once the opponent confirms, or when the confirmation window lapses."
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {withContext.map(({ match, headToHead }) => (
            <li key={match.id}>
              <Card
                className={match.suspicious ? 'border-warning/50' : undefined}
              >
                {match.suspicious ? (
                  <div className="flex flex-wrap items-center gap-2 border-b border-warning/30 bg-warning/10 px-5 py-3">
                    <Badge tone="warning">Flagged</Badge>
                    <p className="text-sm text-warning">
                      {match.suspicionReasons}
                    </p>
                  </div>
                ) : null}

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <GamemodeBadge
                      name={match.gamemode.name}
                      themeToken="mode-default"
                    />
                    <time
                      dateTime={match.createdAt.toISOString()}
                      className="tnum text-xs text-text-muted"
                    >
                      Submitted{' '}
                      {match.createdAt.toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                    {match.opponentConfirmedAt ? (
                      <Badge tone="positive">Opponent confirmed</Badge>
                    ) : (
                      <Badge tone="info">Escalated — no response</Badge>
                    )}
                  </div>

                  {/* Side by side on desktop, stacked on mobile (§672). */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <PlayerSide
                      username={match.submitter.username}
                      minecraft={match.submitter.minecraftUsername}
                      score={match.submitterScore}
                      winner={match.winnerId === match.submitter.id}
                      role="Submitter"
                    />

                    <span
                      aria-hidden="true"
                      className="hidden text-center font-display text-sm text-text-muted sm:block"
                    >
                      VS
                    </span>

                    <PlayerSide
                      username={match.opponent.username}
                      minecraft={match.opponent.minecraftUsername}
                      score={match.opponentScore}
                      winner={match.winnerId === match.opponent.id}
                      role="Opponent"
                      align="right"
                    />
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Head to head
                      </dt>
                      <dd className="tnum mt-0.5 text-text-primary">
                        {headToHead.wins}–{headToHead.losses}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Total meetings
                      </dt>
                      <dd className="tnum mt-0.5 text-text-primary">
                        {headToHead.total}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Evidence
                      </dt>
                      <dd className="mt-0.5">
                        {match.evidence[0] ? (
                          <Link
                            href={`/api/evidence/${match.evidence[0].id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:text-accent-strong"
                          >
                            Open screenshot ↗
                          </Link>
                        ) : (
                          <span className="text-negative">
                            No evidence attached
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {match.notes ? (
                    <p className="mt-4 rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-text-secondary">
                      <span className="text-text-muted">Submitter note:</span>{' '}
                      {match.notes}
                    </p>
                  ) : null}

                  <div className="mt-5 border-t border-line pt-5">
                    <MatchReviewForm matchId={match.id} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}

function PlayerSide({
  username,
  minecraft,
  score,
  winner,
  role,
  align = 'left',
}: {
  username: string
  minecraft: string
  score: number
  winner: boolean
  role: string
  align?: 'left' | 'right'
}) {
  return (
    <div
      className={
        align === 'right'
          ? 'flex items-center gap-3 sm:flex-row-reverse sm:text-right'
          : 'flex items-center gap-3'
      }
    >
      <PlayerAvatar username={minecraft} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-2xs uppercase tracking-wider text-text-muted">
          {role}
        </p>
        <Link
          href={`/players/${username}`}
          className="block truncate text-text-primary hover:text-accent"
        >
          {username}
        </Link>
      </div>
      <span
        className={
          'tnum font-display text-2xl ' +
          (winner ? 'text-positive' : 'text-text-secondary')
        }
      >
        {score}
        {winner ? <span className="sr-only"> (winner)</span> : null}
      </span>
    </div>
  )
}
