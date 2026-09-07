/**
 * Canonical values for every status/role column in the schema.
 *
 * Role and status columns are `String` in the database. This module is the
 * single place that says which strings are legal.
 * Never compare a role or status against a bare string literal elsewhere —
 * import from here so a typo becomes a type error.
 */

export const ROLES = {
  PLAYER: 'PLAYER',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Privilege ordering: PLAYER < ADMIN < OWNER (FULL_BUILD §393).
 *
 * Comparing ranks rather than listing roles keeps authorization checks honest:
 * `rank(actor) >= rank(required)` cannot accidentally omit OWNER the way an
 * explicit `['ADMIN']` array can.
 */
export const ROLE_RANK: Record<Role, number> = {
  [ROLES.PLAYER]: 0,
  [ROLES.ADMIN]: 1,
  [ROLES.OWNER]: 2,
}

export const USER_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES]

export const MATCH_STATUSES = {
  /** Submitted; waiting for the named opponent to confirm it happened. */
  PENDING_OPPONENT: 'PENDING_OPPONENT',
  /** Confirmed by the opponent, or escalated past the window. Awaiting admin. */
  PENDING_ADMIN: 'PENDING_ADMIN',
  /** Admin approved. Ratings have been applied. Terminal. */
  APPROVED: 'APPROVED',
  /** Admin rejected, or the opponent disputed it. Terminal. No rating change. */
  REJECTED: 'REJECTED',
  /** Withdrawn by the submitter before review. Terminal. */
  CANCELLED: 'CANCELLED',
} as const

export type MatchStatus = (typeof MATCH_STATUSES)[keyof typeof MATCH_STATUSES]

/** Statuses from which a match can still change. Anything else is final. */
export const OPEN_MATCH_STATUSES: readonly MatchStatus[] = [
  MATCH_STATUSES.PENDING_OPPONENT,
  MATCH_STATUSES.PENDING_ADMIN,
]

export const NOTIFICATION_TYPES = {
  REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
  MATCH_AWAITING_CONFIRMATION: 'MATCH_AWAITING_CONFIRMATION',
  MATCH_OPPONENT_CONFIRMED: 'MATCH_OPPONENT_CONFIRMED',
  MATCH_OPPONENT_REJECTED: 'MATCH_OPPONENT_REJECTED',
  MATCH_APPROVED: 'MATCH_APPROVED',
  MATCH_REJECTED: 'MATCH_REJECTED',
  MATCH_INFO_REQUESTED: 'MATCH_INFO_REQUESTED',
  RATING_CHANGED: 'RATING_CHANGED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_REINSTATED: 'ACCOUNT_REINSTATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
} as const

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

export const AUDIT_ACTIONS = {
  ADMIN_APPROVED_PLAYER: 'ADMIN_APPROVED_PLAYER',
  ADMIN_REJECTED_PLAYER: 'ADMIN_REJECTED_PLAYER',
  ADMIN_SUSPENDED_PLAYER: 'ADMIN_SUSPENDED_PLAYER',
  ADMIN_REINSTATED_PLAYER: 'ADMIN_REINSTATED_PLAYER',
  ADMIN_APPROVED_MATCH: 'ADMIN_APPROVED_MATCH',
  ADMIN_REJECTED_MATCH: 'ADMIN_REJECTED_MATCH',
  OWNER_PROMOTED_ADMIN: 'OWNER_PROMOTED_ADMIN',
  OWNER_DEMOTED_ADMIN: 'OWNER_DEMOTED_ADMIN',
  LINKED_DISCORD_ACCOUNT: 'LINKED_DISCORD_ACCOUNT',
  UNLINKED_DISCORD_ACCOUNT: 'UNLINKED_DISCORD_ACCOUNT',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

/** Which queue a mirrored Discord approval card belongs to. */
export const DISCORD_APPROVAL_KINDS = {
  PLAYER: 'PLAYER',
  MATCH: 'MATCH',
} as const

export type DiscordApprovalKind =
  (typeof DISCORD_APPROVAL_KINDS)[keyof typeof DISCORD_APPROVAL_KINDS]

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** Rating every player starts each gamemode on. */
export const STARTING_RATING = 1000

/**
 * Matches a player must complete in a gamemode before their rating stops being
 * provisional. Provisional ratings move faster so new players reach their true
 * level in fewer games.
 */
export const PROVISIONAL_MATCH_THRESHOLD = 10

/** Hours an opponent has to confirm before the match escalates to an admin. */
export const OPPONENT_CONFIRMATION_WINDOW_HOURS = 48

/** Session lifetime. */
export const SESSION_DURATION_DAYS = 30

/** Password reset token lifetime. */
export const PASSWORD_RESET_WINDOW_MINUTES = 60

/** Largest evidence screenshot accepted, in bytes. */
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024

/** Image types accepted as evidence, checked by magic bytes not by MIME. */
export const ALLOWED_EVIDENCE_TYPES = ['png', 'jpeg', 'webp'] as const
export type AllowedEvidenceType = (typeof ALLOWED_EVIDENCE_TYPES)[number]

/**
 * Anti-manipulation thresholds (FULL_BUILD §49). These raise a flag for human
 * review — they never punish automatically (§1486).
 */
export const SUSPICION_RULES = {
  /** More than this many submissions in the window looks automated. */
  MAX_SUBMISSIONS_PER_WINDOW: 15,
  SUBMISSION_WINDOW_MINUTES: 10,
  /** Repeatedly facing the same opponent in a short span. */
  MAX_SAME_OPPONENT_PER_DAY: 5,
  /** A score gap this wide is unusual enough to look at. */
  IMPLAUSIBLE_SCORE_GAP: 20,
} as const

/** Page sizes used by the roster and leaderboards. */
export const PAGE_SIZE = 20
