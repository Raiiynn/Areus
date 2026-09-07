import 'server-only'

import { MATCH_STATUSES, USER_STATUSES } from '@/domain/constants'
import { hasAtLeastRole } from '@/lib/auth/roles'
import { ROLES } from '@/domain/constants'
import { db } from '@/lib/db'

/**
 * A cheap fingerprint of everything a given viewer's page depends on.
 *
 * The client polls this and re-renders when the string changes. It exists
 * because a decision can now be taken outside the browser — from Discord — so
 * a page that only refreshes on its own mutations would sit there showing a
 * queue item somebody already handled.
 *
 * Polling rather than a push stream is forced by the deployment target: on
 * serverless there is no shared memory between instances and no long-lived
 * connection to hold, so an in-process event emitter feeding SSE would work on
 * one instance and silently do nothing on the others.
 *
 * The version is scoped to the viewer, and deliberately coarse — it says
 * "something you can see has changed", not what. Working out what changed is
 * what the subsequent render is for.
 */

interface Viewer {
  id: string
  role: string
  status: string
}

function stamp(date: Date | null | undefined): string {
  return date ? String(date.getTime()) : '0'
}

export async function computeLiveVersion(viewer: Viewer): Promise<string> {
  if (hasAtLeastRole(viewer, ROLES.ADMIN)) {
    // Both aggregates are index-served: User has @@index([status]) and Match
    // has @@index([status, createdAt]).
    const [players, matches] = await Promise.all([
      db.user.aggregate({
        where: { status: USER_STATUSES.PENDING },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      db.match.aggregate({
        where: { status: MATCH_STATUSES.PENDING_ADMIN },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
    ])

    return [
      'staff',
      players._count._all,
      stamp(players._max.updatedAt),
      matches._count._all,
      stamp(matches._max.updatedAt),
    ].join(':')
  }

  // A player watches their own approval land, and their notification badge.
  const [self, unread] = await Promise.all([
    db.user.findUnique({
      where: { id: viewer.id },
      select: { status: true, updatedAt: true },
    }),
    db.notification.count({ where: { userId: viewer.id, readAt: null } }),
  ])

  return ['self', self?.status ?? 'gone', stamp(self?.updatedAt), unread].join(
    ':',
  )
}
