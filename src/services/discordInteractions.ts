import 'server-only'

import {
  DISCORD_APPROVAL_KINDS,
  ROLES,
  USER_STATUSES,
  type DiscordApprovalKind,
} from '@/domain/constants'
import { hasAtLeastRole } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { discordConfig } from '@/lib/discord/config'
import {
  APPROVAL_ACTIONS,
  decodeApprovalId,
  type ApprovalAction,
} from '@/lib/discord/customId'
import {
  buildRejectModal,
  deferredEphemeral,
  ephemeral,
  PONG,
} from '@/lib/discord/messages'
import { reviewPlayerSchema, reviewMatchSchema } from '@/lib/validation/schemas'
import { AdminError, reviewPlayer } from '@/services/admin'
import { MatchError, reviewMatch } from '@/services/matches'

/**
 * The whole of the Discord interaction logic.
 *
 * It lives in a service rather than in the route handler for one reason: the
 * test suite drives services directly and never touches route handlers, so
 * anything left in `route.ts` is code that cannot be tested here. The route is
 * reduced to signature verification and JSON.
 *
 * The security model, in order:
 *
 * 1. The route has already verified the Ed25519 signature. Nothing below runs
 *    for an unsigned request.
 * 2. The guild and channel are pinned. A forged payload is already impossible,
 *    but this bounds the blast radius if the bot is ever invited elsewhere.
 * 3. Authority comes only from `member.user.id` mapped to a linked AREUS
 *    account with sufficient role. `member.permissions` and `member.roles` are
 *    Discord's opinion about Discord and are never consulted — being a Discord
 *    server admin confers nothing here.
 * 4. The decision itself goes through `reviewPlayer`/`reviewMatch`, which
 *    re-read the target and enforce every invariant independently. Nothing is
 *    trusted because it arrived in a custom_id.
 */

// Discord interaction types.
const PING = 1
const MESSAGE_COMPONENT = 3
const MODAL_SUBMIT = 5

export interface DiscordInteraction {
  type?: number
  token?: string
  guild_id?: string
  channel_id?: string
  member?: { user?: { id?: string; username?: string } }
  user?: { id?: string; username?: string }
  data?: {
    custom_id?: string
    components?: Array<{
      components?: Array<{ custom_id?: string; value?: string }>
    }>
  }
}

export type InteractionResponse = Record<string, unknown>

/**
 * Either the final response, or an immediate ack plus the work still to run.
 *
 * APPROVE and the reject modal's submission both write to the database and
 * then call out to Discord again to clear the card — routinely more than the
 * 3 seconds Discord allows before an interaction shows "did not respond in
 * time". Those two get deferred; every other path (PING, opening the reject
 * modal, and every rejection before a decision is attempted) is a single
 * cheap read or no I/O at all and answers inline.
 */
export type HandlerResult =
  | { deferred: false; response: InteractionResponse }
  | {
      deferred: true
      ack: InteractionResponse
      run: () => Promise<InteractionResponse>
    }

interface Actor {
  id: string
  username: string
}

/**
 * Maps a Discord user to an AREUS administrator.
 *
 * Returns null for every failure — unlinked, unknown, insufficient role,
 * suspended — without distinguishing them to the caller. The clicking user
 * learns only that they may not do this; which of the four reasons applies is
 * not their business and would leak whether an account is linked.
 */
async function resolveActor(
  interaction: DiscordInteraction,
): Promise<Actor | null> {
  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id
  if (!discordUserId) return null

  const user = await db.user.findUnique({
    where: { discordUserId },
    select: { id: true, username: true, role: true, status: true },
  })

  if (!user) return null
  if (user.status === USER_STATUSES.SUSPENDED) return null
  if (!hasAtLeastRole(user, ROLES.ADMIN)) return null

  return { id: user.id, username: user.username }
}

/** Both service error types carry messages written to be shown to a person. */
function describe(error: unknown): string {
  if (error instanceof AdminError || error instanceof MatchError) {
    return error.message
  }
  console.error('Discord interaction failed:', error)
  return 'Something went wrong. Try the decision on the site instead.'
}

function fromOurGuild(interaction: DiscordInteraction): boolean {
  return (
    interaction.guild_id === discordConfig.guildId &&
    interaction.channel_id === discordConfig.channelId
  )
}

/** Pulls the `reason` field out of a modal submission. */
function readReason(interaction: DiscordInteraction): string {
  for (const row of interaction.data?.components ?? []) {
    for (const input of row.components ?? []) {
      if (input.custom_id === 'reason') return input.value ?? ''
    }
  }
  return ''
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

async function decide(
  kind: DiscordApprovalKind,
  targetId: string,
  actor: Actor,
  approve: boolean,
  reason: string,
): Promise<InteractionResponse> {
  // Re-validated through the same schemas the web forms use. The modal's
  // min_length is a client-side courtesy; this is the enforcement.
  if (kind === DISCORD_APPROVAL_KINDS.PLAYER) {
    const parsed = reviewPlayerSchema.safeParse({
      userId: targetId,
      decision: approve ? 'APPROVE' : 'REJECT',
      reason,
    })
    if (!parsed.success) {
      return ephemeral(
        parsed.error.issues[0]?.message ?? 'That decision was not valid.',
      )
    }

    await reviewPlayer({
      actorId: actor.id,
      userId: parsed.data.userId,
      decision: parsed.data.decision as 'APPROVE' | 'REJECT',
      reason: parsed.data.reason || undefined,
      // The claim that makes two simultaneous clicks resolve to one decision.
      expectedStatus: USER_STATUSES.PENDING,
    })

    return ephemeral(
      approve ? 'Registration approved.' : 'Registration rejected.',
    )
  }

  const parsed = reviewMatchSchema.safeParse({
    matchId: targetId,
    decision: approve ? 'APPROVE' : 'REJECT',
    reason,
  })
  if (!parsed.success) {
    return ephemeral(
      parsed.error.issues[0]?.message ?? 'That decision was not valid.',
    )
  }

  await reviewMatch({
    matchId: parsed.data.matchId,
    reviewerId: actor.id,
    decision: parsed.data.decision as 'APPROVE' | 'REJECT',
    reason: parsed.data.reason || undefined,
  })

  return ephemeral(approve ? 'Match approved.' : 'Match rejected.')
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function handleDiscordInteraction(
  interaction: DiscordInteraction,
): Promise<HandlerResult> {
  if (interaction.type === PING) return { deferred: false, response: PONG }

  if (
    interaction.type !== MESSAGE_COMPONENT &&
    interaction.type !== MODAL_SUBMIT
  ) {
    return { deferred: false, response: ephemeral('Unsupported interaction.') }
  }

  if (!fromOurGuild(interaction)) {
    return {
      deferred: false,
      response: ephemeral('This bot does not take decisions in this channel.'),
    }
  }

  const id = decodeApprovalId(interaction.data?.custom_id)
  if (!id) {
    return { deferred: false, response: ephemeral('That button is no longer valid.') }
  }

  const actor = await resolveActor(interaction)
  if (!actor) {
    return {
      deferred: false,
      response: ephemeral(
        'Your Discord account is not linked to an AREUS administrator. Link it on your AREUS profile.',
      ),
    }
  }

  const subject =
    id.kind === DISCORD_APPROVAL_KINDS.PLAYER ? 'registration' : 'match'
  const action: ApprovalAction = id.action

  // A button cannot carry text, and a rejection reason is mandatory, so the
  // click opens a modal and the decision happens on its submission. Opening a
  // modal is instant — no I/O — so this answers inline.
  if (action === APPROVAL_ACTIONS.REJECT) {
    return { deferred: false, response: buildRejectModal(id.kind, id.targetId, subject) }
  }

  const approve = action === APPROVAL_ACTIONS.APPROVE
  const reason = approve ? '' : readReason(interaction)

  return {
    deferred: true,
    ack: deferredEphemeral(),
    run: async () => {
      try {
        return await decide(id.kind, id.targetId, actor, approve, reason)
      } catch (error) {
        return ephemeral(describe(error))
      }
    },
  }
}
