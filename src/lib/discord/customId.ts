import {
  DISCORD_APPROVAL_KINDS,
  type DiscordApprovalKind,
} from '@/domain/constants'

/**
 * Encoding for the `custom_id` Discord echoes back on every button click and
 * modal submit.
 *
 * This is the parsing boundary for attacker-shaped input, which is why it is
 * its own module with its own tests. Two rules hold everywhere it is used:
 *
 * - Decoding returns null rather than throwing, and the caller treats null as
 *   a refusal. There is no partially-parsed state.
 * - The decoded target id is an opaque lookup key and nothing more. Every
 *   caller re-reads the target from the database and re-runs the full service
 *   invariants; nothing is trusted because it arrived in a custom_id.
 *
 * The `v1` segment exists so a future format change cannot be misread as a
 * valid id by an older deployment still serving traffic.
 */

const PREFIX = 'areus:v1'

/** Discord's hard limit on custom_id, for buttons and modals alike. */
export const MAX_CUSTOM_ID_LENGTH = 100

export const APPROVAL_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  /** Modal submit carrying the rejection reason. */
  REJECT_SUBMIT: 'reject-submit',
} as const

export type ApprovalAction =
  (typeof APPROVAL_ACTIONS)[keyof typeof APPROVAL_ACTIONS]

export interface ApprovalId {
  kind: DiscordApprovalKind
  action: ApprovalAction
  targetId: string
}

const KINDS = Object.values(DISCORD_APPROVAL_KINDS) as string[]
const ACTIONS = Object.values(APPROVAL_ACTIONS) as string[]

export class CustomIdError extends Error {}

/**
 * Builds a custom_id, asserting it fits.
 *
 * Throws rather than truncating: a truncated id would decode to a different
 * target, and failing here surfaces in a test rather than in production.
 */
export function encodeApprovalId(
  kind: DiscordApprovalKind,
  action: ApprovalAction,
  targetId: string,
): string {
  const encoded = `${PREFIX}:${kind}:${action}:${targetId}`

  if (encoded.length > MAX_CUSTOM_ID_LENGTH) {
    throw new CustomIdError(
      `custom_id is ${encoded.length} characters, over Discord's ${MAX_CUSTOM_ID_LENGTH} limit`,
    )
  }

  return encoded
}

/** Parses a custom_id. Returns null for anything that is not exactly one of ours. */
export function decodeApprovalId(raw: unknown): ApprovalId | null {
  if (typeof raw !== 'string') return null
  if (raw.length > MAX_CUSTOM_ID_LENGTH) return null

  const parts = raw.split(':')
  // Exactly five segments: a target id containing ':' would otherwise let a
  // crafted value smuggle extra structure past this check.
  if (parts.length !== 5) return null

  const [namespace, version, kind, action, targetId] = parts
  if (`${namespace}:${version}` !== PREFIX) return null
  if (!kind || !KINDS.includes(kind)) return null
  if (!action || !ACTIONS.includes(action)) return null
  if (!targetId) return null

  return {
    kind: kind as DiscordApprovalKind,
    action: action as ApprovalAction,
    targetId,
  }
}
