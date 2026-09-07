import type { Metadata } from 'next'
import Link from 'next/link'

import { PlayerDecisionForm } from '@/components/admin/PlayerDecisionForm'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROLES, USER_STATUSES } from '@/domain/constants'
import { listPendingPlayers, listPlayersForAdmin } from '@/services/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Player management' }

const STATUS_TONE = {
  [USER_STATUSES.PENDING]: 'warning',
  [USER_STATUSES.APPROVED]: 'positive',
  [USER_STATUSES.REJECTED]: 'negative',
  [USER_STATUSES.SUSPENDED]: 'negative',
} as const

export default async function AdminPlayersPage() {
  const [pending, all] = await Promise.all([
    listPendingPlayers(),
    listPlayersForAdmin(),
  ])

  return (
    <PageShell>
      <PageHeader
        title="Players"
        description="Approve registrations and manage existing accounts."
      />

      <Card className={pending.length > 0 ? 'border-warning/40' : undefined}>
        <CardHeader
          title={`Pending registrations (${pending.length})`}
          description="Check the Minecraft username looks genuine before approving."
        />

        {pending.length === 0 ? (
          <EmptyState
            title="No pending registrations"
            description="New sign-ups appear here for review."
          />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((player) => (
              <li key={player.id} className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <PlayerAvatar
                    username={player.minecraftUsername}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary">{player.username}</p>
                    <p className="text-sm text-text-secondary">
                      Minecraft:{' '}
                      <span className="font-mono">
                        {player.minecraftUsername}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted">{player.email}</p>
                  </div>
                  <time
                    dateTime={player.createdAt.toISOString()}
                    className="tnum text-xs text-text-muted"
                  >
                    {player.createdAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                </div>

                <div className="mt-4">
                  <PlayerDecisionForm
                    userId={player.id}
                    decisions={[
                      { decision: 'APPROVE', label: 'Approve' },
                      { decision: 'REJECT', label: 'Reject' },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-8">
        <CardHeader title="All accounts" />

        <ul className="divide-y divide-line">
          {all.map((player) => {
            const suspended = player.status === USER_STATUSES.SUSPENDED
            const approved = player.status === USER_STATUSES.APPROVED
            const isOwnerAccount = player.role === ROLES.OWNER

            return (
              <li key={player.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PlayerAvatar
                    username={player.minecraftUsername}
                    size={32}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {approved ? (
                        <Link
                          href={`/players/${player.username}`}
                          className="text-text-primary hover:text-accent"
                        >
                          {player.username}
                        </Link>
                      ) : (
                        <span className="text-text-primary">
                          {player.username}
                        </span>
                      )}
                      {player.role !== ROLES.PLAYER ? (
                        <Badge tone="accent">{player.role}</Badge>
                      ) : null}
                      <Badge
                        tone={
                          STATUS_TONE[
                            player.status as keyof typeof STATUS_TONE
                          ] ?? 'neutral'
                        }
                      >
                        {player.status}
                      </Badge>
                    </div>
                    {player.statusReason ? (
                      <p className="mt-1 text-xs text-text-muted">
                        {player.statusReason}
                      </p>
                    ) : null}
                  </div>

                  {/* The owner account is not actionable from here — the
                      service refuses it too, so this only avoids showing a
                      button that would fail. */}
                  {!isOwnerAccount && approved ? (
                    <PlayerDecisionForm
                      userId={player.id}
                      decisions={[{ decision: 'SUSPEND', label: 'Suspend' }]}
                    />
                  ) : null}

                  {!isOwnerAccount && suspended ? (
                    <PlayerDecisionForm
                      userId={player.id}
                      decisions={[
                        { decision: 'REINSTATE', label: 'Reinstate' },
                      ]}
                    />
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </PageShell>
  )
}
