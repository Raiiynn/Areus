import Link from 'next/link'
import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { formatDuration } from '@/domain/hardcore'
import type { HardcoreSnapshot } from '@/services/hardcore'

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-content space-y-8 px-4 py-8 md:px-6 lg:px-8">
      {children}
    </div>
  )
}

export function PortalHeading({
  eyebrow = 'THE SURVIVAL CHAPTER',
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description: string
}) {
  return (
    <header className="space-y-3">
      <p className="smp-eyebrow">{eyebrow}</p>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="max-w-prose text-sm text-text-secondary">{description}</p>
    </header>
  )
}

export function PortalPanel({
  title,
  children,
  href,
  linkLabel = 'Explore',
}: {
  title: string
  children: ReactNode
  href?: string
  linkLabel?: string
}) {
  return (
    <section className="smp-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="font-display text-lg">{title}</h2>
        {href && (
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm text-accent-strong hover:underline"
            href={href}
          >
            {linkLabel}
            <span aria-hidden="true">↗</span>
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

export function Unavailable({
  title = 'The story is still unwritten',
  description = 'Verified season data will appear here when the server integration is connected.',
  compact = false,
}: {
  title?: string
  description?: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'px-5 py-6' : 'px-5 py-10 text-center'}>
      <span
        aria-hidden="true"
        className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface-overlay text-xl text-accent-strong"
      >
        ◇
      </span>
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mx-auto mt-2 max-w-prose text-sm text-text-secondary">
        {description}
      </p>
      <Link
        href="/minecraft#season"
        className="mt-3 inline-flex min-h-11 items-center text-sm text-accent-strong hover:underline"
      >
        About this season <span aria-hidden="true"> →</span>
      </Link>
    </div>
  )
}

export function DataNotice() {
  return (
    <p className="smp-notice">
      <span aria-hidden="true">◌</span> Awaiting verified season data. Rankings
      and activity are not live yet.
    </p>
  )
}

export function SeasonStats({ snapshot }: { snapshot: HardcoreSnapshot }) {
  const stats = [
    [
      'Registered players',
      snapshot.registeredPlayers?.toLocaleString() ?? '—',
      'Verified Minecraft identities',
    ],
    [
      'Active factions',
      snapshot.activeFactionCount?.toLocaleString() ?? '—',
      'A world built together',
    ],
    [
      'Total deaths',
      snapshot.totalDeaths?.toLocaleString() ?? '—',
      'Every life has a story',
    ],
    [
      'Total playtime',
      snapshot.totalPlaytimeMinutes === null
        ? '—'
        : formatDuration(snapshot.totalPlaytimeMinutes),
      'Time spent in the wilderness',
    ],
    [
      'Current season',
      snapshot.season?.name ?? 'Pending',
      'Season 01 · proposed',
    ],
    [
      'Server status',
      snapshot.serverStatus === 'unknown' ? 'Unknown' : snapshot.serverStatus,
      'Private access only',
    ],
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map(([label, value, detail]) => (
        <div key={label} className="smp-panel p-4">
          <dt className="text-xs text-text-secondary">{label}</dt>
          <dd className="mt-3 font-display text-2xl capitalize">{value}</dd>
          <dd className="mt-2 text-xs text-text-muted">{detail}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CommunityCallout() {
  return (
    <section className="smp-community flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div>
        <p className="smp-eyebrow">MORE THAN A SERVER</p>
        <h2 className="mt-3 font-display text-2xl">
          Your next chapter starts with us.
        </h2>
        <p className="mt-3 max-w-prose text-sm text-text-secondary">
          A private Minecraft community. Shared adventures, rival factions, and
          stories worth remembering.
        </p>
      </div>
      <ButtonLink href="/community" variant="ghost">
        Explore the community <span aria-hidden="true">↗</span>
      </ButtonLink>
    </section>
  )
}
