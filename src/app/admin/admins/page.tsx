import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { RoleChangeForm } from '@/components/admin/RoleChangeForm'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROLES, USER_STATUSES } from '@/domain/constants'
import { isOwner } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/session'
import { listAdmins, listPlayersForAdmin } from '@/services/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Administrators' }

/**
 * Owner-only administrator management (FULL_BUILD §43).
 *
 * The gate is repeated here even though the layout already checks for ADMIN:
 * the layout admits administrators, and this page must not. The action itself
 * calls `requireOwner` regardless, so this is defence in depth rather than the
 * control.
 */
export default async function AdminsPage() {
  const user = await getCurrentUser()
  if (!user || !isOwner(user)) redirect('/not-found')

  const [admins, allPlayers] = await Promise.all([
    listAdmins(),
    listPlayersForAdmin(USER_STATUSES.APPROVED),
  ])

  const promotable = allPlayers.filter(
    (player) => player.role === ROLES.PLAYER,
  )

  return (
    <PageShell>
      <PageHeader
        title="Administrators"
        description="Only the owner can change who moderates AREUS."
      />

      <Card>
        <CardHeader title="Current staff" />
        <ul className="divide-y divide-line">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex flex-wrap items-center gap-3 p-4"
            >
              <PlayerAvatar username={admin.minecraftUsername} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-text-primary">{admin.username}</p>
              </div>
              <Badge tone="accent">{admin.role}</Badge>

              {admin.role === ROLES.OWNER ? (
                <span className="text-xs text-text-muted">
                  The owner role cannot be changed
                </span>
              ) : (
                <RoleChangeForm
                  userId={admin.id}
                  role="PLAYER"
                  label="Demote to player"
                  variant="danger"
                />
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-8">
        <CardHeader
          title="Promote a player"
          description="Only approved players can be promoted."
        />

        {promotable.length === 0 ? (
          <EmptyState
            title="No players available"
            description="Every approved player already holds a staff role."
          />
        ) : (
          <ul className="divide-y divide-line">
            {promotable.map((player) => (
              <li
                key={player.id}
                className="flex flex-wrap items-center gap-3 p-4"
              >
                <PlayerAvatar username={player.minecraftUsername} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary">{player.username}</p>
                  <p className="text-xs text-text-muted">
                    {player.minecraftUsername}
                  </p>
                </div>
                <RoleChangeForm
                  userId={player.id}
                  role="ADMIN"
                  label="Promote to admin"
                  variant="primary"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  )
}
