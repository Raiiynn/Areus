import type { Metadata } from 'next'
import Link from 'next/link'

import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { RatingValue } from '@/components/domain/RatingValue'
import { TierBadge } from '@/components/domain/TierBadge'
import { GamemodeBadge } from '@/components/domain/GamemodeBadge'
import { PageHeader, PageShell, Pagination } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { resolveTier } from '@/domain/tiers'
import { listActiveGamemodes, listTiers } from '@/services/gamemodes'
import { listPlayers } from '@/services/players'
import { playerFiltersSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Players',
  description: 'Every approved AREUS competitor.',
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const raw = await searchParams

  // Query strings are user input like any other: parsed, not trusted. An
  // unparseable filter falls back to defaults rather than throwing.
  const parsed = playerFiltersSchema.safeParse(raw)
  const filters = parsed.success ? parsed.data : {}

  const [result, gamemodes, tiers] = await Promise.all([
    listPlayers(filters),
    listActiveGamemodes(),
    listTiers(),
  ])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Roster"
        title="Players"
        description="Everyone approved to compete on AREUS."
      />

      {/* GET form: filters end up in the URL, so a filtered roster is
          shareable and the back button behaves (FULL_BUILD §889). */}
      <form
        method="get"
        className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <div>
          <label htmlFor="q" className="sr-only">
            Search by username
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder="Search username…"
            defaultValue={filters.q ?? ''}
          />
        </div>

        <div>
          <label htmlFor="gamemode" className="sr-only">
            Filter by gamemode
          </label>
          <Select
            id="gamemode"
            name="gamemode"
            defaultValue={filters.gamemode ?? ''}
          >
            <option value="">All gamemodes</option>
            {gamemodes.map((mode) => (
              <option key={mode.id} value={mode.slug}>
                {mode.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="sort" className="sr-only">
            Sort by
          </label>
          <Select id="sort" name="sort" defaultValue={filters.sort ?? 'rating'}>
            <option value="rating">Highest rating</option>
            <option value="matches">Most matches</option>
            <option value="username">Username</option>
          </Select>
        </div>

        <Button type="submit" variant="ghost">
          Apply
        </Button>
      </form>

      <Card>
        {result.players.length === 0 ? (
          <EmptyState
            title="No players match those filters"
            description={
              filters.q
                ? `Nothing found for “${filters.q}”. Try a shorter search.`
                : 'No approved players yet. Registrations appear here once an administrator approves them.'
            }
            action={
              filters.q || filters.gamemode ? (
                <Link
                  href="/players"
                  className="text-sm text-accent hover:text-accent-strong"
                >
                  Clear filters
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {result.players.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/players/${player.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-instant hover:bg-surface-overlay"
                  >
                    <PlayerAvatar
                      username={player.minecraftUsername}
                      size={36}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-text-primary">
                        {player.username}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {player.bestGamemode ? (
                          <GamemodeBadge
                            name={player.bestGamemode.name}
                            themeToken="mode-default"
                          />
                        ) : (
                          <span className="text-xs text-text-muted">
                            No ranked gamemode yet
                          </span>
                        )}
                        <span className="tnum text-xs text-text-muted">
                          {player.totalMatches}{' '}
                          {player.totalMatches === 1 ? 'match' : 'matches'}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <RatingValue value={player.bestRating} size="sm" />
                      <TierBadge
                        tier={
                          player.bestRating === null
                            ? null
                            : resolveTier(player.bestRating, tiers)
                        }
                        size="sm"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              basePath="/players"
              searchParams={{
                q: filters.q,
                gamemode: filters.gamemode,
                sort: filters.sort,
              }}
            />
          </>
        )}
      </Card>
    </PageShell>
  )
}
