import { ROLES, ROLE_RANK, type Role } from '@/domain/constants'

/**
 * Pure role predicates, safe on both server and client.
 *
 * These are deliberately separate from `authorization.ts`, which is
 * `server-only` and throws. Client components need to decide what to *render*
 * — which navigation entries to show, which buttons to draw — and that is not
 * the same thing as deciding what is *permitted*.
 *
 * Nothing here is a security control. Every privileged action re-checks on the
 * server (FULL_BUILD §1332). Hiding a link the server would refuse anyway is a
 * courtesy to the user, not a defence.
 */

export function hasAtLeastRole(user: { role: string }, role: Role): boolean {
  const rank = ROLE_RANK[user.role as Role]
  return rank !== undefined && rank >= ROLE_RANK[role]
}

export function isStaff(user: { role: string }): boolean {
  return hasAtLeastRole(user, ROLES.ADMIN)
}

export function isOwner(user: { role: string }): boolean {
  return hasAtLeastRole(user, ROLES.OWNER)
}
