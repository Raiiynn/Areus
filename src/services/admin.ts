import 'server-only'

import {
  AUDIT_ACTIONS,
  MATCH_STATUSES,
  NOTIFICATION_TYPES,
  ROLES,
  USER_STATUSES,
  type Role,
  type UserStatus,
} from '@/domain/constants'
import { db } from '@/lib/db'
import { destroyAllSessionsFor } from '@/lib/auth/session'
import { recordAudit } from '@/services/audit'
import { resolvePlayerApproval } from '@/services/discordApprovals'
import { notify } from '@/services/notifications'

/**
 * Administrative and owner operations (FULL_BUILD §42, §43).
 *
 * Every function here assumes the caller has already passed the matching
 * `requireRole` gate — but none of them assumes the *target* is legitimate.
 * The invariants that stop an admin from escalating their own privileges are
 * enforced in this module, not in the UI.
 */

export class AdminError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminError'
  }
}

export async function listPendingPlayers() {
  return db.user.findMany({
    where: { status: USER_STATUSES.PENDING },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      username: true,
      email: true,
      minecraftUsername: true,
      createdAt: true,
    },
  })
}

export async function listPlayersForAdmin(status?: string) {
  return db.user.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      username: true,
      email: true,
      minecraftUsername: true,
      role: true,
      status: true,
      statusReason: true,
      createdAt: true,
    },
  })
}

/**
 * Approve, reject, suspend or reinstate a registration.
 *
 * `expectedStatus` turns the write into an atomic claim: the update only lands
 * if the account is still in the status the caller believed it was, and losing
 * that race is an error rather than a silent overwrite. It is optional because
 * SUSPEND and REINSTATE must work from any status, and because the web queue
 * only ever renders decision buttons for accounts it just read as pending.
 *
 * The Discord approval cards always pass it, and that is what the option is
 * for: a card can sit in a channel for hours, so two admins clicking Approve
 * and Reject at the same moment is a real sequence rather than a theoretical
 * one. Without the claim both would succeed, both would write an audit row, and
 * the player would receive two contradictory notifications.
 */
export async function reviewPlayer(params: {
  actorId: string
  userId: string
  decision: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REINSTATE'
  reason?: string
  expectedStatus?: UserStatus
}) {
  const target = await db.user.findUnique({ where: { id: params.userId } })
  if (!target) throw new AdminError('That player no longer exists.')

  if (target.id === params.actorId) {
    throw new AdminError('You cannot change your own account status.')
  }

  // An admin must not be able to act against an owner, or the hierarchy in
  // FULL_BUILD §399 would be reversible from below.
  const actor = await db.user.findUnique({ where: { id: params.actorId } })
  if (!actor) throw new AdminError('Your account no longer exists.')
  if (target.role === ROLES.OWNER) {
    throw new AdminError('The owner account cannot be modified.')
  }
  if (target.role === ROLES.ADMIN && actor.role !== ROLES.OWNER) {
    throw new AdminError('Only the owner can act on an administrator.')
  }

  const statusByDecision = {
    APPROVE: USER_STATUSES.APPROVED,
    REJECT: USER_STATUSES.REJECTED,
    SUSPEND: USER_STATUSES.SUSPENDED,
    REINSTATE: USER_STATUSES.APPROVED,
  } as const

  const auditByDecision = {
    APPROVE: AUDIT_ACTIONS.ADMIN_APPROVED_PLAYER,
    REJECT: AUDIT_ACTIONS.ADMIN_REJECTED_PLAYER,
    SUSPEND: AUDIT_ACTIONS.ADMIN_SUSPENDED_PLAYER,
    REINSTATE: AUDIT_ACTIONS.ADMIN_REINSTATED_PLAYER,
  } as const

  const notificationByDecision = {
    APPROVE: {
      type: NOTIFICATION_TYPES.REGISTRATION_APPROVED,
      title: 'Your account was approved',
      body: 'You can now submit matches and appear in the rankings.',
    },
    REJECT: {
      type: NOTIFICATION_TYPES.REGISTRATION_REJECTED,
      title: 'Your registration was rejected',
      body: params.reason ?? 'An administrator rejected your registration.',
    },
    SUSPEND: {
      type: NOTIFICATION_TYPES.ACCOUNT_SUSPENDED,
      title: 'Your account was suspended',
      body: params.reason ?? 'An administrator suspended your account.',
    },
    REINSTATE: {
      type: NOTIFICATION_TYPES.ACCOUNT_REINSTATED,
      title: 'Your account was reinstated',
      body: 'You can compete again.',
    },
  } as const

  const nextStatus = statusByDecision[params.decision]

  const updated = await db.$transaction(async (tx) => {
    const data = {
      status: nextStatus,
      statusReason: params.reason?.trim() || null,
      statusChangedAt: new Date(),
      statusChangedById: params.actorId,
    }

    // Claim the account atomically when the caller told us what it expected,
    // so a concurrent decision loses instead of both winning.
    if (params.expectedStatus) {
      const claimed = await tx.user.updateMany({
        where: { id: target.id, status: params.expectedStatus },
        data,
      })
      if (claimed.count === 0) {
        throw new AdminError('This registration has already been reviewed.')
      }
    } else {
      await tx.user.update({ where: { id: target.id }, data })
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: target.id } })

    const notification = notificationByDecision[params.decision]
    await notify(
      {
        userId: target.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        href: '/profile',
      },
      tx,
    )

    await recordAudit(
      {
        actorId: params.actorId,
        action: auditByDecision[params.decision],
        targetType: 'User',
        targetId: target.id,
        metadata: { reason: params.reason ?? null, status: nextStatus },
      },
      tx,
    )

    return user
  })

  // A suspended player must lose access immediately, not when their cookie
  // happens to expire.
  if (nextStatus === USER_STATUSES.SUSPENDED) {
    await destroyAllSessionsFor(target.id)
  }

  // Post-commit and best-effort. Hooked here rather than in the Server Action
  // so the web path, the Discord path and any future caller all clear the card
  // through one implementation. Never throws — see services/discordApprovals.
  await resolvePlayerApproval(target.id, {
    approved: nextStatus === USER_STATUSES.APPROVED,
    decidedById: params.actorId,
    reason: params.reason ?? null,
  })

  return updated
}

/**
 * Promote or demote an administrator. Owner only (FULL_BUILD §43).
 *
 * OWNER is deliberately not assignable: there is no code path that creates a
 * second owner, so the role cannot be spread by mistake or by a compromised
 * admin session.
 */
export async function changeRole(params: {
  actorId: string
  userId: string
  role: Extract<Role, 'PLAYER' | 'ADMIN'>
}) {
  const target = await db.user.findUnique({ where: { id: params.userId } })
  if (!target) throw new AdminError('That player no longer exists.')

  if (target.id === params.actorId) {
    throw new AdminError('You cannot change your own role.')
  }
  if (target.role === ROLES.OWNER) {
    throw new AdminError('The owner role cannot be changed.')
  }
  if (target.status !== USER_STATUSES.APPROVED) {
    throw new AdminError('Only an approved player can be promoted.')
  }
  if (target.role === params.role) {
    throw new AdminError(`That player is already a ${params.role.toLowerCase()}.`)
  }

  const promoting = params.role === ROLES.ADMIN

  return db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: target.id },
      data: { role: params.role },
    })

    await notify(
      {
        userId: target.id,
        type: NOTIFICATION_TYPES.ROLE_CHANGED,
        title: promoting ? 'You are now an administrator' : 'Your role changed',
        body: promoting
          ? 'You can now review registrations and matches.'
          : 'Your administrator access has been removed.',
        href: '/profile',
      },
      tx,
    )

    await recordAudit(
      {
        actorId: params.actorId,
        action: promoting
          ? AUDIT_ACTIONS.OWNER_PROMOTED_ADMIN
          : AUDIT_ACTIONS.OWNER_DEMOTED_ADMIN,
        targetType: 'User',
        targetId: target.id,
        metadata: { role: params.role },
      },
      tx,
    )

    return user
  })
}

/** Counts for the admin dashboard (FULL_BUILD §41). */
export async function getAdminDashboardStats() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    pendingPlayers,
    pendingConfirmations,
    pendingReviews,
    approvedPlayers,
    totalMatches,
    matchesToday,
    suspiciousSubmissions,
  ] = await Promise.all([
    db.user.count({ where: { status: USER_STATUSES.PENDING } }),
    db.match.count({ where: { status: MATCH_STATUSES.PENDING_OPPONENT } }),
    db.match.count({ where: { status: MATCH_STATUSES.PENDING_ADMIN } }),
    db.user.count({ where: { status: USER_STATUSES.APPROVED } }),
    db.match.count({ where: { status: MATCH_STATUSES.APPROVED } }),
    db.match.count({
      where: {
        status: MATCH_STATUSES.APPROVED,
        reviewedAt: { gte: startOfToday },
      },
    }),
    db.match.count({
      where: { suspicious: true, status: MATCH_STATUSES.PENDING_ADMIN },
    }),
  ])

  return {
    pendingPlayers,
    pendingConfirmations,
    pendingReviews,
    approvedPlayers,
    totalMatches,
    matchesToday,
    suspiciousSubmissions,
  }
}

/** The admin review queue: suspicious first, then oldest first. */
export async function listMatchesForReview() {
  return db.match.findMany({
    where: { status: MATCH_STATUSES.PENDING_ADMIN },
    orderBy: [{ suspicious: 'desc' }, { createdAt: 'asc' }],
    include: {
      gamemode: { select: { slug: true, name: true } },
      submitter: { select: { id: true, username: true, minecraftUsername: true } },
      opponent: { select: { id: true, username: true, minecraftUsername: true } },
      evidence: { select: { id: true, mimeType: true } },
    },
  })
}

export async function listAdmins() {
  return db.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.OWNER] } },
    orderBy: [{ role: 'desc' }, { username: 'asc' }],
    select: {
      id: true,
      username: true,
      minecraftUsername: true,
      role: true,
      status: true,
      createdAt: true,
    },
  })
}
