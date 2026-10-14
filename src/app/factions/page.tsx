import type { Metadata } from 'next'
import {
  PortalShell,
  PortalHeading,
  DataNotice,
  PortalPanel,
} from '@/components/hardcore/Portal'
import { FactionDirectory } from '@/components/hardcore/FactionDirectory'
import { getHardcoreSnapshot } from '@/services/hardcore'

export const metadata: Metadata = { title: 'Factions' }
export default async function FactionsPage() {
  const snapshot = await getHardcoreSnapshot()
  return (
    <PortalShell>
      <PortalHeading
        title="Stronger together."
        description="Find your allies. Build your territory. Explore the factions shaping the AREUS world."
      />
      <DataNotice />
      <FactionDirectory
        factions={snapshot.factions}
        players={snapshot.players}
      />
      <PortalPanel title="A balanced measure of strength">
        <div className="space-y-4 p-5 text-sm text-text-secondary">
          <p>
            Proposed ranking configuration — pending owner approval. Categories
            are normalized against eligible factions before weighting. Kill
            performance uses per-member statistics; total kills alone never
            decide a faction’s place.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'PvP performance · 35%',
              'War victories · 30%',
              'Survival performance · 20%',
              'Territory control · 15%',
            ].map((label) => (
              <li className="rounded-md border border-line p-4" key={label}>
                {label}
              </li>
            ))}
          </ul>
          <p>
            Missing war, survival or territory records leave a faction unranked.
            Unavailable metrics are never replaced with invented values.
          </p>
        </div>
      </PortalPanel>
    </PortalShell>
  )
}
