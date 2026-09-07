import type { Metadata } from 'next'
import Link from 'next/link'

import { StatCard } from '@/components/domain/StatCard'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getAdminDashboardStats } from '@/services/admin'
import { recentAuditEntries } from '@/services/audit'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminOverviewPage() {
  const [stats, audit] = await Promise.all([
    getAdminDashboardStats(),
    recentAuditEntries(12),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Overview"
        description="What needs attention, and what staff have done recently."
      />

      {/* Queues first — these are the things a moderator is here to clear. */}
      <section>
        <h2 className="mb-3 text-2xs font-medium uppercase tracking-wider text-text-muted">
          Needs attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QueueCard
            href="/admin/players"
            label="Pending players"
            value={stats.pendingPlayers}
          />
          <QueueCard
            href="/admin/matches"
            label="Awaiting review"
            value={stats.pendingReviews}
          />
          <QueueCard
            href="/admin/matches"
            label="Flagged suspicious"
            value={stats.suspiciousSubmissions}
            tone="warning"
          />
          <StatCard
            label="Awaiting opponent"
            value={stats.pendingConfirmations}
            detail="Not actionable by staff yet"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-2xs font-medium uppercase tracking-wider text-text-muted">
          Platform
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Approved players" value={stats.approvedPlayers} />
          <StatCard label="Total matches" value={stats.totalMatches} />
          <StatCard label="Approved today" value={stats.matchesToday} />
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader
          title="Recent staff actions"
          description="Every privileged action is recorded."
        />

        {audit.length === 0 ? (
          <EmptyState
            title="No staff actions yet"
            description="Approvals, rejections and role changes appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-mono text-xs text-accent">
                  {entry.action}
                </span>
                <span className="text-text-secondary">
                  by {entry.actor?.username ?? 'system'}
                </span>
                <time
                  dateTime={entry.createdAt.toISOString()}
                  className="tnum ml-auto text-xs text-text-muted"
                >
                  {entry.createdAt.toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  )
}

function QueueCard({
  href,
  label,
  value,
  tone = 'neutral',
}: {
  href: string
  label: string
  value: number
  tone?: 'neutral' | 'warning'
}) {
  const empty = value === 0

  return (
    <Link href={href} className="block">
      <StatCard
        label={label}
        value={value}
        detail={empty ? 'Nothing to do' : 'Open queue →'}
        tone={empty ? 'neutral' : tone === 'warning' ? 'warning' : 'accent'}
        className="h-full transition-[border-color,transform] duration-instant hover:-translate-y-px hover:border-line-strong"
      />
    </Link>
  )
}
