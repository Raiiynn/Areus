import 'server-only'

import type { User } from '@prisma/client'

import {
  ROLE_RANK,
  ROLES,
  USER_STATUSES,
  type Role,
} from '@/domain/constants'
import { hasAtLeastRole, isOwner, isStaff } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * Centralized authorization (FULL_BUILD §1364).
 *
 * Every privileged path calls one of these. Authorization logic is not
 * duplicated per route, and none of it depends on what the client sent —
 * §1332 rules out hidden buttons, disabled buttons, client roles, and
 * localStorage as controls.
 *
 * These throw rather than return null so that forgetting to check the result
 * is a runtime failure, not a silent privilege grant.
 */

export class AuthenticationError extends Error {
  constructor(message = 'You must be signed in.') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to do that.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/** Any signed-in user, whatever their approval status. */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new AuthenticationError()
  return user
}

/**
 * A signed-in user whose registration has been approved and who is not
 * suspended. This is the gate for every competitive action.
 */
export async function requireApprovedUser(): Promise<User> {
  const user = await requireAuth()

  if (user.status === USER_STATUSES.SUSPENDED) {
    throw new AuthorizationError(
      'Your account is suspended. Contact an administrator.',
    )
  }
  if (user.status !== USER_STATUSES.APPROVED) {
    throw new AuthorizationError(
      'Your account is awaiting approval before you can compete.',
    )
  }

  return user
}

/**
 * A signed-in user holding at least `role`.
 *
 * Compares privilege rank rather than matching role names, so requiring ADMIN
 * admits OWNER automatically and no check can accidentally omit a higher role.
 * Suspended staff lose their privileges immediately.
 */
export async function requireRole(role: Role): Promise<User> {
  const user = await requireAuth()

  if (user.status === USER_STATUSES.SUSPENDED) {
    throw new AuthorizationError('Your account is suspended.')
  }

  if (ROLE_RANK[user.role as Role] === undefined) {
    // An unrecognised role in the database is a corruption, not a permission.
    throw new AuthorizationError('Your account role is not recognised.')
  }

  if (ROLE_RANK[user.role as Role] < ROLE_RANK[role]) {
    throw new AuthorizationError()
  }

  return user
}

export const requireAdmin = () => requireRole(ROLES.ADMIN)
export const requireOwner = () => requireRole(ROLES.OWNER)

// The non-throwing predicates live in `./roles` so client components can use
// them too. Re-exported here so server code has one import for both.
export { hasAtLeastRole, isOwner, isStaff }

/**
 * Object-level ownership check (guards against IDOR, FULL_BUILD §1929).
 *
 * Staff bypass ownership deliberately — reviewing other players' matches is
 * their job — but a plain player may only reach their own records.
 */
export function assertOwnsOrStaff(
  user: Pick<User, 'id' | 'role'>,
  ownerId: string,
): void {
  if (user.id === ownerId) return
  if (isStaff(user)) return
  throw new AuthorizationError()
}
