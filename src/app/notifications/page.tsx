import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { requireAuth } from '@/lib/auth/authorization'
import { getCurrentUser } from '@/lib/auth/session'
import { listNotifications, markRead } from '@/services/notifications'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Notifications' }

async function markAllReadAction() {
  'use server'
  // Scoped to the caller: markRead filters by userId, so this cannot touch
  // anyone else's notifications.
  const user = await requireAuth()
  await markRead(user.id)
  revalidatePath('/notifications')
}

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const notifications = await listNotifications(user.id)
  const unread = notifications.filter((item) => item.readAt === null).length

  return (
    <PageShell>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread`
            : 'You are up to date.'
        }
        action={
          unread > 0 ? (
            <form action={markAllReadAction}>
              <Button type="submit" variant="ghost">
                Mark all read
              </Button>
            </form>
          ) : null
        }
      />

      <Card>
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="Match confirmations, review decisions and rating changes appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((item) => {
              const body = (
                <>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        item.readAt === null ? 'bg-accent' : 'bg-line-strong',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary">
                        {item.title}
                        {item.readAt === null ? (
                          <span className="sr-only"> (unread)</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {item.body}
                      </p>
                      <time
                        dateTime={item.createdAt.toISOString()}
                        className="mt-1 block text-xs text-text-muted"
                      >
                        {item.createdAt.toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>
                </>
              )

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block px-4 py-4 transition-colors duration-instant hover:bg-surface-overlay"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="px-4 py-4">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </PageShell>
  )
}
