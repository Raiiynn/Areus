import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LeaderboardTable } from '@/components/domain/LeaderboardTable'
import { StatCard } from '@/components/domain/StatCard'
import { PageHeader, PageShell, Pagination } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getGamemodeBySlug, listGamemodesWithStats, listTiers } from '@/services/gamemodes'
import { getLeaderboard } from '@/services/players'

export const dynamic = 'force-dynamic'

/** Dynamic metadata, per FULL_BUILD §920. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const gamemode = await getGamemodeBySlug(slug)

  if (!gamemode) return { title: 'Gamemode not found' }

  return {
    title: `${gamemode.name} Rankings`,
    description: gamemode.description,
    openGraph: {
      title: `AREUS — ${gamemode.name} Rankings`,
      description: gamemode.description,
    },
  }
}

export default async function GamemodePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const { page: pageParam } = await searchParams

  const gamemode = await getGamemodeBySlug(slug)
  if (!gamemode) notFound()

  const page = Math.max(1, Number(pageParam) || 1)
  const [board, tiers, allWithStats] = await Promise.all([
    getLeaderboard(slug, page),
    listTiers(),
    listGamemodesWithStats(),
  ])

  const stats = allWithStats.find((mode) => mode.slug === slug)

  return (
    <PageShell>
      <PageHeader
        eyebrow="Gamemode"
        title={gamemode.name}
        description={gamemode.description}
        action={
          <ButtonLink href="/matches/submit" variant="accent">
            Submit a match
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ranked players"
          value={stats?.rankedPlayers ?? 0}
        />
        <StatCard label="Matches played" value={stats?.totalMatches ?? 0} />
        <StatCard
          label="Top player"
          value={stats?.topPlayer?.username ?? '—'}
          tone="accent"
        />
        <StatCard label="Average rating" value={stats?.averageRating ?? '—'} />
      </div>

      <Card className="mt-8">
        <div className="border-b border-line px-4 py-4">
          <h2 className="font-display text-xl text-text-primary">Rules</h2>
          <p className="mt-1 max-w-prose text-sm text-text-secondary">
            {gamemode.rules}
          </p>
        </div>

        {board.rows.length === 0 ? (
          <EmptyState
            title="No ranked players yet"
            description={`Nobody has completed a reviewed ${gamemode.name} match.`}
          />
        ) : (
          <>
            <LeaderboardTable rows={board.rows} tiers={tiers} />
            <Pagination
              page={board.page}
              pageCount={board.pageCount}
              total={board.total}
              basePath={`/gamemodes/${slug}`}
            />
          </>
        )}
      </Card>
    </PageShell>
  )
}
