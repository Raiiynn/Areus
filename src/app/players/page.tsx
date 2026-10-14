import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PortalShell,
  PortalHeading,
  PortalPanel,
  DataNotice,
  Unavailable,
} from '@/components/hardcore/Portal'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { Pagination } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { listPlayers } from '@/services/players'
import { playerFiltersSchema } from '@/lib/validation/schemas'
import { getHardcoreSnapshot } from '@/services/hardcore'
import { formatDuration } from '@/domain/hardcore'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Players',
  description: 'The AREUS community and verified Hardcore SMP survivors.',
}
export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const raw = await searchParams
  const parsed = playerFiltersSchema.safeParse({
    q: raw.q,
    page: raw.page,
    sort: 'username',
  })
  const filters = parsed.success ? parsed.data : { sort: 'username' as const }
  const [snapshot, result] = await Promise.all([
    getHardcoreSnapshot(),
    listPlayers(filters),
  ])
  const survivors = snapshot.players.filter((player) =>
    player.username.toLowerCase().includes((filters.q ?? '').toLowerCase()),
  )
  return (
    <PortalShell>
      <PortalHeading
        title="Meet the survivors."
        eyebrow="THE AREUS ROSTER"
        description="Explore the people behind the stories. Verified Minecraft profiles use stable UUIDs; existing community accounts remain accessible."
      />
      <DataNotice />
      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-2 text-xs text-text-secondary">
          Search player username
          <input
            name="q"
            type="search"
            maxLength={50}
            defaultValue={filters.q ?? ''}
            className="smp-filter"
            placeholder="Search the community…"
          />
        </label>
        <Button type="submit">Search players</Button>
        <Link
          href="/players"
          className="inline-flex min-h-11 items-center justify-center px-4 text-sm text-accent-strong"
        >
          Clear search
        </Link>
      </form>
      <PortalPanel title="Verified SMP identities">
        {survivors.length ? (
          <ul className="divide-y divide-line">
            {survivors.map((player) => (
              <li key={player.uuid}>
                <Link
                  href={`/players/${player.uuid}`}
                  className="flex min-h-11 items-center gap-4 p-5"
                >
                  <PlayerAvatar username={player.uuid} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{player.username}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {player.edition ?? 'Edition unverified'} ·{' '}
                      {player.factionName ?? 'Unaffiliated'}
                    </p>
                  </div>
                  <span className="text-sm text-accent-strong">
                    {formatDuration(player.survivalMinutes)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable
            title="Verified survivor profiles are on the way"
            description="Community usernames cannot establish Java or Bedrock identity. SMP profiles will appear once Minecraft UUIDs are verified."
          />
        )}
      </PortalPanel>
      <PortalPanel title="Approved community accounts">
        <p className="border-b border-line px-5 py-4 text-sm text-text-secondary">
          These are genuine approved website accounts. Minecraft UUIDs, editions
          and survival statistics are not yet linked.
        </p>
        {result.players.length ? (
          <ul className="divide-y divide-line">
            {result.players.map((player) => (
              <li key={player.id}>
                <Link
                  href={`/players/${encodeURIComponent(player.username)}`}
                  className="flex min-h-11 items-center gap-4 p-5 hover:bg-surface-overlay"
                >
                  <PlayerAvatar username={player.minecraftUsername} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{player.username}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      UUID unverified · Community account
                    </p>
                  </div>
                  <span aria-hidden="true" className="text-accent-strong">
                    ↗
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable
            title="No community accounts found"
            description="Try a different search. Accounts appear here after administrator approval."
          />
        )}
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          basePath="/players"
          searchParams={{ q: filters.q }}
        />
      </PortalPanel>
    </PortalShell>
  )
}
