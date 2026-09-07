import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { listGamemodesWithStats } from '@/services/gamemodes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gamemodes',
  description:
    'Every AREUS gamemode, its rules, and the state of its ladder.',
}

export default async function GamemodesPage() {
  const gamemodes = await listGamemodesWithStats()

  return (
    <PageShell>
      <PageHeader
        eyebrow="Competition"
        title="Gamemodes"
        description="Each gamemode keeps a separate rating, so being ranked in one says nothing about another."
      />

      {gamemodes.length === 0 ? (
        <Card>
          <EmptyState
            title="No gamemodes are active"
            description="An administrator activates gamemodes before matches can be submitted."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gamemodes.map((mode) => (
            <li key={mode.id}>
              <Card interactive className="h-full">
                <Link
                  href={`/gamemodes/${mode.slug}`}
                  className="flex h-full flex-col p-5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: `var(--${mode.themeToken}, var(--mode-default))`,
                      }}
                    />
                    <h2 className="font-display text-xl text-text-primary">
                      {mode.name}
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-text-secondary">
                    {mode.description}
                  </p>

                  {/* responsive-ok: two short stat cells, ~120px each at 320px */}
                  <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                    <div>
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Ranked players
                      </dt>
                      <dd className="tnum mt-0.5 text-text-primary">
                        {mode.rankedPlayers}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Matches
                      </dt>
                      <dd className="tnum mt-0.5 text-text-primary">
                        {mode.totalMatches}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Top player
                      </dt>
                      <dd className="mt-0.5 truncate text-text-primary">
                        {mode.topPlayer?.username ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase tracking-wider text-text-muted">
                        Average rating
                      </dt>
                      <dd className="tnum mt-0.5 text-text-primary">
                        {mode.averageRating ?? '—'}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}
