import type { Metadata } from 'next'
import {
  PortalHeading,
  PortalShell,
  PortalPanel,
  SeasonStats,
  DataNotice,
} from '@/components/hardcore/Portal'
import { ButtonLink } from '@/components/ui/Button'
import { SMP_FEATURES } from '@/domain/hardcore'
import { getHardcoreSnapshot } from '@/services/hardcore'

export const metadata: Metadata = { title: 'Hardcore SMP' }

export default async function MinecraftPage() {
  const snapshot = await getHardcoreSnapshot()
  return (
    <PortalShell>
      <PortalHeading
        title="A world worth surviving."
        description="AREUS Hardcore SMP brings survival, factions and lasting consequences into one private Minecraft community. Java and Bedrock identities will be verified through the server integration."
      />
      <section id="season" className="smp-hero p-6 md:p-10">
        <p className="smp-eyebrow">SEASON 01 · PROPOSED</p>
        <h2 className="mt-4 font-display text-3xl">
          Your story starts in the wilderness.
        </h2>
        <p className="mt-4 max-w-prose text-sm text-text-secondary">
          The season schedule, progression and server status are awaiting
          confirmation. Access remains private; this portal publishes community
          information and intentionally public statistics.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/leaderboard" variant="accent">
            Explore rankings
          </ButtonLink>
          <ButtonLink href="/factions">Discover factions</ButtonLink>
        </div>
      </section>
      <SeasonStats snapshot={snapshot} />
      <DataNotice />
      <section id="deathban" className="smp-panel p-6 md:p-8">
        <span className="smp-chip">
          Planned mechanic · configuration unverified
        </span>
        <h2 className="mt-4 font-display text-2xl">DeathBan — 30 minutes</h2>
        <p className="mt-4 font-display text-xl text-negative">
          SKILL ISSUE LU DEKS LOL 💀
        </p>
        <p lang="id" className="mt-3 text-text-secondary">
          Kamu mati dan terkena DeathBan selama 30 menit.
        </p>
        <p className="mt-4 max-w-prose text-sm text-text-secondary">
          The proposed mechanic temporarily restricts login after a death. An
          active cooldown will only be displayed from a verified server expiry
          timestamp. No player is shown as banned without that record.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">The survival toolkit</h2>
        <p className="mt-3 text-sm text-text-secondary">
          Requested features are planned. Enabled status requires verification
          against the actual server configuration.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SMP_FEATURES.map(([name, description], index) => (
            <li className="smp-panel p-5" key={name}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="font-display text-xl text-accent-strong"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="smp-chip">Planned</span>
              </div>
              <h3 className="font-display text-lg">{name}</h3>
              <p className="mt-3 text-sm text-text-secondary">{description}</p>
            </li>
          ))}
        </ul>
      </section>
      <PortalPanel title="Private by design">
        <p className="p-5 text-sm text-text-secondary">
          Connection instructions are shared through approved private channels.
          Public pages do not provide server connection details. Membership
          approval and server access are separate processes.
        </p>
      </PortalPanel>
    </PortalShell>
  )
}
