import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import {
  PortalShell,
  PortalPanel,
  DataNotice,
  SeasonStats,
  CommunityCallout,
  Unavailable,
} from '@/components/hardcore/Portal'
import { getHardcoreSnapshot } from '@/services/hardcore'
import {
  filterSurvivors,
  formatDuration,
  rankFactions,
} from '@/domain/hardcore'

export default async function HomePage() {
  const snapshot = await getHardcoreSnapshot()
  const topPlayers = filterSurvivors(
    snapshot.players,
    '',
    'survivors',
    snapshot.season?.id ?? '',
    1,
  ).rows.slice(0, 3)
  const topFactions = rankFactions(snapshot.factions).slice(0, 3)
  return (
    <PortalShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="smp-eyebrow">AREUS OFFICIAL / HARDCORE SMP</p>
        <span className="smp-chip">Java + Bedrock · Private community</span>
      </div>
      <section className="smp-hero px-6 py-12 md:px-10 md:py-16">
        <div className="max-w-prose">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="smp-chip">Season 01 · proposed</span>
            <span className="smp-chip">
              <span aria-hidden="true">◇</span> Private server
            </span>
          </div>
          <p className="smp-eyebrow">ONE WORLD. EVERY LIFE MATTERS.</p>
          <h1 className="smp-hero-title mt-4">
            AREUS
            <br />
            <strong>HARDCORE SMP</strong>
          </h1>
          <p className="mt-5 font-display text-xl">
            Survive. Conquer. Dominate.
          </p>
          <p className="mt-3 max-w-prose text-sm text-text-secondary">
            Enter a world where survival matters, factions rise and fall, and
            every death has consequences. Write your own story in AREUS Hardcore
            SMP.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/minecraft" variant="accent">
              Explore Season <span aria-hidden="true">→</span>
            </ButtonLink>
            <ButtonLink href="/leaderboard">View Leaderboard</ButtonLink>
            <ButtonLink href="/factions" variant="ghost">
              Explore Factions
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-text-secondary">
            Survival multiplayer. Shared stories. Private access.
          </p>
        </div>
      </section>
      <section aria-labelledby="season-overview">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="season-overview" className="font-display text-xl">
            Season overview
          </h2>
          <span className="text-xs text-text-secondary">
            Verified telemetry pending
          </span>
        </div>
        <SeasonStats snapshot={snapshot} />
      </section>
      <DataNotice />
      <div className="grid gap-6 lg:grid-cols-2">
        <PortalPanel
          title="Top survivors"
          href="/leaderboard"
          linkLabel="Full leaderboard"
        >
          {topPlayers.length ? (
            <ol className="divide-y divide-line">
              {topPlayers.map((player, index) => (
                <li key={player.uuid} className="flex items-center gap-4 p-5">
                  <span className="font-display text-xl text-accent-strong">
                    0{index + 1}
                  </span>
                  <Link
                    href={`/players/${player.uuid}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {player.username}
                  </Link>
                  <span className="text-sm text-text-secondary">
                    {formatDuration(player.survivalMinutes)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Unavailable
              title="Legends are made by surviving"
              description="The top three survivors will appear after verified season statistics arrive."
            />
          )}
        </PortalPanel>
        <PortalPanel
          title="Leading factions"
          href="/factions"
          linkLabel="All factions"
        >
          {topFactions.length ? (
            <ol className="divide-y divide-line">
              {topFactions.map(({ faction, score }, index) => (
                <li key={faction.id} className="flex items-center gap-4 p-5">
                  <span className="font-display text-xl text-accent-strong">
                    0{index + 1}
                  </span>
                  <Link
                    className="min-w-0 flex-1 truncate hover:underline"
                    href={`/factions/${faction.id}`}
                  >
                    {faction.name}
                  </Link>
                  <span>{score.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Unavailable
              title="Build something that lasts"
              description="Faction standings need verified survival, war and territory data. Proposed scores are not official rules."
            />
          )}
        </PortalPanel>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Longest survival', 'longest', 'A life worth remembering.'],
          ['Most kills', 'kills', 'Every encounter leaves a mark.'],
          ['Most deaths', 'deaths', 'Every setback tells a story.'],
        ].map(([label, category, detail]) => (
          <Link
            key={category}
            href={`/leaderboard?category=${category}`}
            className="smp-panel flex min-h-11 items-center justify-between gap-3 p-5 transition-colors hover:border-line-strong"
          >
            <div>
              <h2 className="font-display text-lg">{label}</h2>
              <p className="mt-2 text-xs text-text-secondary">{detail}</p>
            </div>
            <span aria-hidden="true" className="text-accent-strong">
              ↗
            </span>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PortalPanel
          title="Recent deaths"
          href="/minecraft#deathban"
          linkLabel="About DeathBan"
        >
          {snapshot.deaths.length ? (
            <ul className="divide-y divide-line">
              {snapshot.deaths.slice(0, 5).map((death) => (
                <li key={death.id} className="p-5">
                  <Link
                    href={`/players/${death.playerUuid}`}
                    className="text-accent-strong"
                  >
                    {death.username}
                  </Link>
                  <p className="mt-1 text-sm">{death.cause}</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    {death.factionName ?? 'No faction'} ·{' '}
                    <time dateTime={death.occurredAt}>
                      {new Date(death.occurredAt).toLocaleString('en-GB', {
                        timeZone: 'UTC',
                      })}{' '}
                      UTC
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Unavailable
              compact
              title="No verified death events"
              description="Recent deaths and authoritative DeathBan timestamps will appear here once connected."
            />
          )}
        </PortalPanel>
        <PortalPanel
          title="Upcoming events"
          href="/events"
          linkLabel="Event calendar"
        >
          {snapshot.events.length ? (
            <ul>
              {snapshot.events.slice(0, 3).map((event) => (
                <li key={event.id} className="p-5">
                  <Link
                    className="text-accent-strong"
                    href={`/events/${event.id}`}
                  >
                    {event.title}
                  </Link>
                  <p className="mt-2 text-sm text-text-secondary">
                    {event.category} · {event.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Unavailable
              compact
              title="The next adventure is on the horizon"
              description="No verified events have been published. Dates and countdowns appear when an event is scheduled."
            />
          )}
        </PortalPanel>
      </div>
      <section className="smp-panel flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="smp-eyebrow">DEATH HAS CONSEQUENCES</p>
          <h2 className="mt-3 font-display text-2xl">
            One death. 30 minutes to rethink.
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Discover the proposed DeathBan mechanic and the features shaping our
            survival experience.
          </p>
        </div>
        <ButtonLink href="/minecraft#deathban">
          Explore the mechanics →
        </ButtonLink>
      </section>
      <CommunityCallout />
    </PortalShell>
  )
}
