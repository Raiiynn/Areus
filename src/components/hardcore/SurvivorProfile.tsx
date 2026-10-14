import Link from 'next/link'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { PortalShell, PortalPanel, Unavailable } from './Portal'
import {
  formatDuration,
  formatRatio,
  type Survivor,
  type DeathEvent,
} from '@/domain/hardcore'

export function SurvivorProfile({
  player,
  deaths,
}: {
  player: Survivor
  deaths: DeathEvent[]
}) {
  return (
    <PortalShell>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <PlayerAvatar username={player.uuid} size={80} />
        <div className="min-w-0">
          <p className="smp-eyebrow">SURVIVOR PROFILE</p>
          <h1 className="mt-3 break-words font-display text-3xl">
            {player.username}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            {player.edition ?? 'Edition not verified'} ·{' '}
            {player.factionId ? (
              <Link
                href={`/factions/${player.factionId}`}
                className="text-accent-strong"
              >
                {player.factionName}
              </Link>
            ) : (
              'Unaffiliated'
            )}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-text-secondary">
            UUID: {player.uuid}
          </p>
        </div>
      </header>
      <PortalPanel title="Season statistics">
        <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Kills', player.kills],
            ['Deaths', player.deaths],
            ['K/D', formatRatio(player.kills, player.deaths)],
            ['Playtime', formatDuration(player.playtimeMinutes)],
            ['Longest survival', formatDuration(player.longestSurvivalMinutes)],
            ['Current streak', formatDuration(player.survivalMinutes)],
            ['DeathBan count', player.deathBanCount],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-text-secondary">{label}</dt>
              <dd className="mt-2 font-display text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      </PortalPanel>
      <div className="grid gap-5 lg:grid-cols-2">
        <PortalPanel title="Recent deaths">
          {deaths.length ? (
            <ul className="divide-y divide-line">
              {deaths.map((death) => (
                <li className="p-5" key={death.id}>
                  <p>{death.cause}</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    <time dateTime={death.occurredAt}>
                      {new Date(death.occurredAt).toLocaleString('en-GB', {
                        timeZone: 'UTC',
                      })}{' '}
                      UTC
                    </time>
                  </p>
                  {death.deathBanExpiresAt && (
                    <p className="mt-2 text-sm text-text-secondary">
                      Recorded DeathBan expiry:{' '}
                      <time dateTime={death.deathBanExpiresAt}>
                        {new Date(death.deathBanExpiresAt).toLocaleString(
                          'en-GB',
                          { timeZone: 'UTC' },
                        )}{' '}
                        UTC
                      </time>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Unavailable
              title="No recorded deaths"
              description="Verified death events will appear here. No active ban is inferred from missing records."
            />
          )}
        </PortalPanel>
        <PortalPanel title="Season achievements">
          {player.achievements.length ? (
            <ul className="space-y-3 p-5">
              {player.achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
          ) : (
            <Unavailable title="No recorded achievements" />
          )}
        </PortalPanel>
        {['Survival history', 'Playtime progression'].map((title) => (
          <PortalPanel key={title} title={title}>
            <Unavailable
              title="History unavailable"
              description="Historical samples have not been provided by the server integration."
            />
          </PortalPanel>
        ))}
      </div>
    </PortalShell>
  )
}
