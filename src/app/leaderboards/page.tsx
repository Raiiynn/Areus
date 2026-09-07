import type { Metadata } from 'next'
import Link from 'next/link'

import { LeaderboardTable } from '@/components/domain/LeaderboardTable'
import { PageHeader, PageShell, Pagination } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { listActiveGamemodes, listTiers } from '@/services/gamemodes'
import { getLeaderboard } from '@/services/players'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Leaderboards',
  description:
    'Per-gamemode rankings. Every rating is the result of reviewed matches.',
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ gamemode?: string; page?: string }>
}) {
  const params = await searchParams
  const gamemodes = await listActiveGamemodes()

  if (gamemodes.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Leaderboards" />
        <Card>
          <EmptyState
            title="No gamemodes yet"
            description="Leaderboards appear once an administrator activates a gamemode."
          />
        </Card>
      </PageShell>
    )
  }

  // Default to the first gamemode rather than showing nothing.
  const activeSlug =
    gamemodes.find((mode) => mode.slug === params.gamemode)?.slug ??
    gamemodes[0]!.slug
  const activeMode = gamemodes.find((mode) => mode.slug === activeSlug)!

  const page = Math.max(1, Number(params.page) || 1)
  const [board, tiers] = await Promise.all([
    getLeaderboard(activeSlug, page),
    listTiers(),
  ])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Rankings"
        title="Leaderboards"
        description="Each gamemode has its own ladder. Ratings only move after an administrator approves a match."
      />

      {/* Gamemode switcher. Horizontally scrollable rather than wrapping into
          four ragged rows on a narrow screen — and it scrolls inside its own
          container, so the page never scrolls sideways. */}
      <nav aria-label="Gamemode" className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex w-max gap-2">
          {gamemodes.map((mode) => {
            const active = mode.slug === activeSlug
            return (
              <li key={mode.id}>
                <Link
                  href={`/leaderboards?gamemode=${mode.slug}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-instant',
                    active
                      ? 'border-accent/50 bg-accent-dim text-accent'
                      : 'border-line text-text-secondary hover:border-line-strong hover:text-text-primary',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: `var(--${mode.themeToken}, var(--mode-default))`,
                    }}
                  />
                  {mode.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-4">
          <h2 className="font-display text-xl text-text-primary">
            {activeMode.name}
          </h2>
          <p className="text-sm text-text-secondary">{activeMode.description}</p>
        </div>

        {board.rows.length === 0 ? (
          <EmptyState
            title="No ranked players yet"
            description={`Nobody has completed a reviewed ${activeMode.name} match. The first approved match puts a player on this board.`}
            action={
              <ButtonLink href="/matches/submit" variant="accent">
                Submit a match
              </ButtonLink>
            }
          />
        ) : (
          <>
            <LeaderboardTable rows={board.rows} tiers={tiers} />
            <Pagination
              page={board.page}
              pageCount={board.pageCount}
              total={board.total}
              basePath="/leaderboards"
              searchParams={{ gamemode: activeSlug }}
            />
          </>
        )}
      </Card>
    </PageShell>
  )
}
