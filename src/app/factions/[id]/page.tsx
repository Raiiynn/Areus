import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  PortalShell,
  PortalHeading,
  PortalPanel,
  Unavailable,
} from '@/components/hardcore/Portal'
import { formatRatio } from '@/domain/hardcore'
import { getHardcoreSnapshot } from '@/services/hardcore'

export default async function FactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const snapshot = await getHardcoreSnapshot()
  const faction = snapshot.factions.find((item) => item.id === id)
  if (!faction) notFound()
  const members = snapshot.players.filter((player) =>
    faction.memberUuids.includes(player.uuid),
  )
  return (
    <PortalShell>
      <PortalHeading
        eyebrow={`FACTION / ${faction.tag}`}
        title={faction.name}
        description={faction.description}
      />
      <PortalPanel title="Faction overview">
        <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Members', faction.memberUuids.length],
            ['Kills', faction.kills],
            ['Deaths', faction.deaths],
            ['K/D', formatRatio(faction.kills, faction.deaths)],
            ['Power', faction.power],
            ['Territory claimed', faction.territory],
            ['War wins', faction.warWins],
            ['War losses', faction.warLosses],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-text-secondary">{label}</dt>
              <dd className="mt-2 font-display text-xl">
                {value ?? 'Unavailable'}
              </dd>
            </div>
          ))}
        </dl>
      </PortalPanel>
      <PortalPanel title="Leader and member roster">
        {members.length ? (
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li
                className="flex flex-wrap justify-between gap-3 p-5"
                key={member.uuid}
              >
                <Link
                  href={`/players/${member.uuid}`}
                  className="inline-flex min-h-11 items-center text-accent-strong"
                >
                  {member.username}{' '}
                  {member.uuid === faction.leaderUuid ? '· Leader' : ''}
                </Link>
                <p className="text-sm text-text-secondary">
                  {member.kills} kills · {member.deaths} deaths ·{' '}
                  {formatRatio(member.kills, member.deaths)} K/D
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable title="Roster unavailable" />
        )}
      </PortalPanel>
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          'Territory information',
          'War history',
          'Recent faction activity',
        ].map((title) => (
          <PortalPanel key={title} title={title}>
            <Unavailable
              title="Awaiting faction plugin data"
              description="Detailed records will appear when verified by the server integration."
            />
          </PortalPanel>
        ))}
        <PortalPanel title="Faction achievements">
          {faction.achievements.length ? (
            <ul className="space-y-3 p-5">
              {faction.achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
          ) : (
            <Unavailable title="No verified achievements" />
          )}
        </PortalPanel>
      </div>
    </PortalShell>
  )
}
