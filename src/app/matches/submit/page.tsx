import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { USER_STATUSES } from '@/domain/constants'
import { getCurrentUser } from '@/lib/auth/session'
import { listActiveGamemodes } from '@/services/gamemodes'

import { SubmitMatchForm } from './SubmitMatchForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Submit a match' }

export default async function SubmitMatchPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // The page-level gate is a courtesy that produces a good message. The action
  // re-checks with requireApprovedUser regardless — this is not the control.
  if (user.status !== USER_STATUSES.APPROVED) {
    return (
      <PageShell>
        <PageHeader title="Submit a match" />
        <Card>
          <EmptyState
            title={
              user.status === USER_STATUSES.SUSPENDED
                ? 'Your account is suspended'
                : 'Your account is awaiting approval'
            }
            description={
              user.status === USER_STATUSES.SUSPENDED
                ? user.statusReason ??
                  'Contact an administrator if you think this is a mistake.'
                : 'An administrator has to approve your registration before you can submit matches.'
            }
            action={
              <ButtonLink href="/profile" variant="ghost">
                View your status
              </ButtonLink>
            }
          />
        </Card>
      </PageShell>
    )
  }

  const gamemodes = await listActiveGamemodes()

  if (gamemodes.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Submit a match" />
        <Card>
          <EmptyState
            title="No gamemodes are active"
            description="There is nothing to submit a match for yet."
          />
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Report a result"
        title="Submit a match"
        description="Every submission is confirmed by your opponent and reviewed by an administrator before it counts."
      />

      <div className="max-w-2xl">
        <SubmitMatchForm
          gamemodes={gamemodes.map((mode) => ({
            slug: mode.slug,
            name: mode.name,
          }))}
          username={user.username}
        />
      </div>
    </PageShell>
  )
}
