import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PortalHeading,
  PortalShell,
  PortalPanel,
} from '@/components/hardcore/Portal'
import { SMP_FEATURES } from '@/domain/hardcore'

export const metadata: Metadata = { title: 'Community rules' }
export default function RulesPage() {
  return (
    <PortalShell>
      <PortalHeading
        title="A fair world is worth protecting."
        eyebrow="COMMUNITY & SURVIVAL"
        description="Respect the community, protect private access, and follow the rules published by the server team."
      />
      <PortalPanel title="Private community">
        <div className="space-y-4 p-5 text-sm text-text-secondary">
          <p>
            Server access is private. Keep connection details and member
            information within approved channels.
          </p>
          <p>
            Report suspected cheating, abuse or exploits privately to the
            community team. Do not publish private member data.
          </p>
          <p>
            These are website privacy guidelines. Detailed in-game conduct,
            faction war and territory rules are awaiting owner confirmation.
          </p>
        </div>
      </PortalPanel>
      <PortalPanel title="Proposed Hardcore SMP mechanics">
        <div className="p-5">
          <p className="text-sm text-text-secondary">
            The requested mechanics below are planned and operational status is
            unverified. They are not represented as active server rules.
          </p>
          <ul className="mt-5 space-y-3">
            {SMP_FEATURES.map(([name, detail]) => (
              <li key={name} className="border-t border-line pt-3">
                <h3 className="font-display text-lg">
                  {name}{' '}
                  <span className="text-xs text-text-secondary">· Planned</span>
                </h3>
                <p className="mt-2 text-sm text-text-secondary">{detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </PortalPanel>
      <Link
        className="inline-flex min-h-11 items-center text-sm text-accent-strong hover:underline"
        href="/rules/pvp"
      >
        Legacy PvP match and gamemode rules ↗
      </Link>
    </PortalShell>
  )
}
