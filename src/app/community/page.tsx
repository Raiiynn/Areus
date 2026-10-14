import type { Metadata } from 'next'
import {
  PortalShell,
  PortalHeading,
  PortalPanel,
} from '@/components/hardcore/Portal'
import { ButtonLink } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Community' }
export default function CommunityPage() {
  return (
    <PortalShell>
      <PortalHeading
        eyebrow="AREUS OFFICIAL"
        title="A world is better with your people."
        description="AREUS is a private gaming community built around shared adventures, survival and the stories we create together."
      />
      <section className="smp-hero p-6 md:p-10">
        <h2 className="font-display text-3xl">
          Survive together.
          <br />
          Remember it forever.
        </h2>
        <p className="mt-5 max-w-prose text-text-secondary">
          Find allies, follow the season, and discover the factions making their
          mark. Java and Bedrock players belong in the same story.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/register" variant="accent">
            Request a community account
          </ButtonLink>
          <ButtonLink href="/rules">Read community rules</ButtonLink>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <PortalPanel title="Private access">
          <p className="p-5 text-sm text-text-secondary">
            Account registration is reviewed by an administrator. A website
            account does not automatically grant Minecraft server access.
            Connection details are shared privately with approved members.
          </p>
        </PortalPanel>
        <PortalPanel title="Discord community">
          <p className="p-5 text-sm text-text-secondary">
            A verified public Discord invitation has not been configured. Ask
            your existing community contact for the approved invitation.
          </p>
        </PortalPanel>
      </div>
    </PortalShell>
  )
}
