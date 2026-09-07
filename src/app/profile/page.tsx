import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ROLES, USER_STATUSES } from '@/domain/constants'
import { hasAtLeastRole } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/session'
import { logoutAction } from '@/server/actions/auth'
import { LinkDiscordForm } from '@/app/profile/LinkDiscordForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'My profile' }

const STATUS_PRESENTATION = {
  [USER_STATUSES.PENDING]: {
    tone: 'warning' as const,
    label: 'Awaiting approval',
    detail:
      'An administrator is reviewing your registration. You can browse AREUS, but you cannot submit matches or appear in the rankings yet.',
  },
  [USER_STATUSES.APPROVED]: {
    tone: 'positive' as const,
    label: 'Approved',
    detail: 'You can submit matches and compete on the ladder.',
  },
  [USER_STATUSES.REJECTED]: {
    tone: 'negative' as const,
    label: 'Rejected',
    detail: 'Your registration was not accepted.',
  },
  [USER_STATUSES.SUSPENDED]: {
    tone: 'negative' as const,
    label: 'Suspended',
    detail: 'This account cannot compete until an administrator reinstates it.',
  },
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const status =
    STATUS_PRESENTATION[user.status as keyof typeof STATUS_PRESENTATION]

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="My profile" />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <PlayerAvatar
                username={user.minecraftUsername}
                size={72}
                className="h-18 w-18"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl text-text-primary">
                    {user.username}
                  </h2>
                  {user.role !== ROLES.PLAYER ? (
                    <Badge tone="accent">{user.role}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Playing as{' '}
                  <span className="font-mono text-text-primary">
                    {user.minecraftUsername}
                  </span>
                </p>
              </div>

              {user.status === USER_STATUSES.APPROVED ? (
                <ButtonLink
                  href={`/players/${user.username}`}
                  variant="ghost"
                  className="sm:ml-auto"
                >
                  Public profile
                </ButtonLink>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Account status" />
            <div className="p-5">
              {status ? (
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <p className="mt-3 max-w-prose text-sm text-text-secondary">
                    {status.detail}
                  </p>
                  {user.statusReason ? (
                    <p className="mt-3 rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-text-secondary">
                      <span className="text-text-muted">
                        Administrator note:
                      </span>{' '}
                      {user.statusReason}
                    </p>
                  ) : null}
                </>
              ) : (
                <Badge tone="neutral">Unknown</Badge>
              )}
            </div>
          </Card>

          {/* Staff only: a linked Discord account is what authorises approving
              from the Discord queue, so it means nothing for a player. */}
          {hasAtLeastRole(user, ROLES.ADMIN) ? (
            <Card>
              <CardHeader
                title="Discord"
                description="Link your Discord account to approve registrations and matches from the approval channel."
              />
              <LinkDiscordForm current={user.discordUserId} />
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Account details" />
            <dl className="divide-y divide-line">
              <Row label="Username" value={user.username} />
              <Row label="Email" value={user.email} />
              <Row label="Minecraft username" value={user.minecraftUsername} />
              <Row
                label="Joined"
                value={user.createdAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </dl>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Quick links" />
            <ul className="divide-y divide-line">
              {[
                { href: '/matches', label: 'My matches' },
                { href: '/notifications', label: 'Notifications' },
                { href: '/leaderboards', label: 'Leaderboards' },
                { href: '/rules', label: 'Rules' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-12 items-center px-4 text-sm text-text-secondary transition-colors duration-instant hover:bg-surface-overlay hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="p-5">
              {/* A plain server action — no client JS needed to sign out. */}
              <form action={logoutAction}>
                <Button type="submit" variant="danger" className="w-full">
                  Sign out
                </Button>
              </form>
            </div>
          </Card>
        </aside>
      </div>
    </PageShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
      <dt className="text-2xs uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="text-sm text-text-primary">{value}</dd>
    </div>
  )
}
