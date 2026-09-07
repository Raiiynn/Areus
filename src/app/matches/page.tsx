import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { GamemodeBadge, WinLossPill } from '@/components/domain/GamemodeBadge'
import { MatchResponseForm } from '@/components/domain/MatchResponseForm'
import { MatchStatusBadge } from '@/components/domain/MatchStatusBadge'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { RatingDelta } from '@/components/domain/RatingValue'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormSuccess } from '@/components/forms/AuthShell'
import { MATCH_STATUSES } from '@/domain/constants'
import { getCurrentUser } from '@/lib/auth/session'
import {
  getAllPlayerMatches,
  getMatchesAwaitingResponse,
} from '@/services/playerMatches'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'My matches' }

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const [awaiting, all] = await Promise.all([
    getMatchesAwaitingResponse(user.id),
    getAllPlayerMatches(user.id),
  ])

  return (
    <PageShell>
      <PageHeader
        eyebrow="History"
        title="My matches"
        description="Everything you have submitted or been named in."
        action={
          <ButtonLink href="/matches/submit" variant="accent">
            Submit a match
          </ButtonLink>
        }
      />

      {params.submitted ? (
        <div className="mb-6">
          <FormSuccess message="Match submitted. Your opponent has been asked to confirm it." />
        </div>
      ) : null}

      {/* Anything needing this player's action comes first — the dashboard
          question "what should I do next?" answered at the top of the page. */}
      {awaiting.length > 0 ? (
        <section className="mb-8">
          <Card className="border-info/40">
            <CardHeader
              title={`${awaiting.length} ${awaiting.length === 1 ? 'match needs' : 'matches need'} your confirmation`}
              description="Someone reported a result against you. Confirm it or dispute it."
            />
            <ul className="divide-y divide-line">
              {awaiting.map((match) => (
                <li key={match.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <PlayerAvatar
                      username={match.submitter.minecraftUsername}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary">
                        <Link
                          href={`/players/${match.submitter.username}`}
                          className="hover:text-accent"
                        >
                          {match.submitter.username}
                        </Link>{' '}
                        <span className="text-text-secondary">reported</span>{' '}
                        <span className="tnum">
                          {match.submitterScore}–{match.opponentScore}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <GamemodeBadge
                          name={match.gamemode.name}
                          themeToken={match.gamemode.themeToken}
                        />
                        {match.evidence[0] ? (
                          <Link
                            href={`/api/evidence/${match.evidence[0].id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:text-accent-strong"
                          >
                            View evidence ↗
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {match.notes ? (
                    <p className="mt-3 rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-text-secondary">
                      {match.notes}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <MatchResponseForm matchId={match.id} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader title="All matches" />

        {all.length === 0 ? (
          <EmptyState
            title="No matches yet"
            description="Submit your first result to get on the ladder."
            action={
              <ButtonLink href="/matches/submit" variant="accent">
                Submit a match
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {all.map((match) => {
              const isSubmitter = match.submitter.id === user.id
              const opponent = isSubmitter ? match.opponent : match.submitter
              const own = isSubmitter
                ? match.submitterScore
                : match.opponentScore
              const theirs = isSubmitter
                ? match.opponentScore
                : match.submitterScore
              const decided = match.status === MATCH_STATUSES.APPROVED
              const delta = match.ratingHistory[0]?.delta

              return (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                >
                  {decided ? (
                    <WinLossPill won={match.winnerId === user.id} />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 place-items-center rounded-sm border border-line text-2xs text-text-muted"
                    >
                      ·
                    </span>
                  )}

                  <GamemodeBadge
                    name={match.gamemode.name}
                    themeToken={match.gamemode.themeToken}
                  />

                  <span className="tnum text-sm text-text-primary">
                    {own}–{theirs}
                  </span>

                  <Link
                    href={`/players/${opponent.username}`}
                    className="min-w-0 flex-1 truncate text-sm text-text-secondary hover:text-text-primary"
                  >
                    vs {opponent.username}
                  </Link>

                  {decided && delta !== undefined ? (
                    <RatingDelta delta={delta} />
                  ) : null}

                  <MatchStatusBadge status={match.status} />

                  {match.reviewReason || match.opponentRejectReason ? (
                    <p className="w-full text-xs text-text-muted">
                      Reason: {match.reviewReason ?? match.opponentRejectReason}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </PageShell>
  )
}
