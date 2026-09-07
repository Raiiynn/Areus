import {
  DISCORD_APPROVAL_KINDS,
  type DiscordApprovalKind,
} from '@/domain/constants'
import { siteUrl } from '@/lib/discord/config'
import { APPROVAL_ACTIONS, encodeApprovalId } from '@/lib/discord/customId'

/**
 * Builders for every Discord payload this integration sends.
 *
 * Pure functions over plain objects — no I/O, no Prisma types, no config
 * beyond the site origin. That is what makes the message shape testable
 * without a database or a network, which matters because Discord rejects an
 * over-long embed with a 400 and the card simply never appears.
 *
 * Evidence screenshots are deliberately **not** attached. `/api/evidence/[id]`
 * requires a session and 404s everyone else on purpose (FULL_BUILD §1574);
 * uploading the bytes to Discord would publish them to everyone in the channel
 * and leave them on Discord's CDN permanently. The card links to the admin
 * queue instead, so a reviewer who wants the screenshot opens the site.
 */

// Discord's documented ceilings. Exceeding any one of them is a 400.
const LIMITS = {
  embedTitle: 256,
  embedDescription: 4096,
  fieldName: 256,
  fieldValue: 1024,
  embedTotal: 6000,
  modalTitle: 45,
  inputLabel: 45,
} as const

const COLOURS = {
  /** Brand periwinkle — awaiting a decision. */
  pending: 0x8b93ee,
  approved: 0x4fb489,
  rejected: 0xd95a67,
  /** Amber — flagged for suspicion, still pending. */
  flagged: 0xd9a44e,
} as const

/** Ephemeral flag. Only the clicking admin sees the reply. */
export const EPHEMERAL = 64

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

/**
 * Neutralises Discord markdown in player-supplied text.
 *
 * A username or a rejection reason is data, not formatting. Without this a
 * player could pick a name that renders as a fake heading or a link.
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_~|>#\-[\]()])/g, '\\$1')
}

interface Field {
  name: string
  value: string
  inline?: boolean
}

function field(name: string, value: string, inline = true): Field {
  return {
    name: truncate(name, LIMITS.fieldName),
    value: truncate(value || '—', LIMITS.fieldValue),
    inline,
  }
}

interface Embed {
  title: string
  description?: string
  color: number
  fields: Field[]
  footer: { text: string }
  timestamp: string
}

/**
 * Trims an embed until it fits Discord's 6000-character total.
 *
 * Drops whole fields from the end rather than mangling text mid-word: a card
 * missing its last detail is readable, a card Discord refuses to render is not.
 */
function fitEmbed(embed: Embed): Embed {
  const size = (e: Embed) =>
    e.title.length +
    (e.description?.length ?? 0) +
    e.footer.text.length +
    e.fields.reduce((total, f) => total + f.name.length + f.value.length, 0)

  const fields = [...embed.fields]
  while (fields.length > 0 && size({ ...embed, fields }) > LIMITS.embedTotal) {
    fields.pop()
  }

  return { ...embed, fields }
}

function decisionRow(kind: DiscordApprovalKind, targetId: string, href: string) {
  return {
    type: 1,
    components: [
      {
        type: 2,
        // 3 = success. One click, no reason required — matching the web form,
        // where APPROVE is the only decision zod lets through without one.
        style: 3,
        label: 'Approve',
        custom_id: encodeApprovalId(kind, APPROVAL_ACTIONS.APPROVE, targetId),
      },
      {
        type: 2,
        // 4 = danger. Opens a modal, because a rejection reason is mandatory
        // and a button cannot carry text.
        style: 4,
        label: 'Reject',
        custom_id: encodeApprovalId(kind, APPROVAL_ACTIONS.REJECT, targetId),
      },
      { type: 2, style: 5, label: 'Open in AREUS', url: siteUrl(href) },
    ],
  }
}

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

export interface PlayerCardInput {
  id: string
  username: string
  email: string
  minecraftUsername: string
  createdAt: Date
}

function playerEmbed(player: PlayerCardInput, colour: number): Embed {
  return fitEmbed({
    title: truncate(
      `Registration — ${escapeMarkdown(player.username)}`,
      LIMITS.embedTitle,
    ),
    color: colour,
    fields: [
      field('Username', escapeMarkdown(player.username)),
      field('Minecraft', escapeMarkdown(player.minecraftUsername)),
      field('Email', escapeMarkdown(player.email), false),
      field(
        'Registered',
        `<t:${Math.floor(player.createdAt.getTime() / 1000)}:R>`,
      ),
    ],
    footer: { text: `Player ${player.id}` },
    timestamp: player.createdAt.toISOString(),
  })
}

export function buildPlayerCard(player: PlayerCardInput) {
  return {
    embeds: [playerEmbed(player, COLOURS.pending)],
    components: [
      decisionRow(DISCORD_APPROVAL_KINDS.PLAYER, player.id, '/admin/players'),
    ],
  }
}

// ---------------------------------------------------------------------------
// Match reviews
// ---------------------------------------------------------------------------

export interface MatchCardInput {
  id: string
  gamemodeName: string
  submitterUsername: string
  opponentUsername: string
  submitterScore: number
  opponentScore: number
  /** Which of the two is recorded as the winner, for the score line. */
  winnerIsSubmitter: boolean
  headToHead: { wins: number; losses: number; total: number }
  suspicious: boolean
  suspicionReasons: string | null
  notes: string | null
  opponentConfirmedAt: Date | null
  hasEvidence: boolean
  createdAt: Date
}

function matchEmbed(match: MatchCardInput, colour: number): Embed {
  const winner = match.winnerIsSubmitter
    ? match.submitterUsername
    : match.opponentUsername

  const fields: Field[] = [
    field('Gamemode', escapeMarkdown(match.gamemodeName)),
    field(
      'Score',
      `${escapeMarkdown(match.submitterUsername)} ${match.submitterScore} — ${match.opponentScore} ${escapeMarkdown(match.opponentUsername)}`,
      false,
    ),
    field('Winner', escapeMarkdown(winner)),
    field(
      'Head to head',
      `${match.headToHead.wins}W — ${match.headToHead.losses}L across ${match.headToHead.total}`,
    ),
    field(
      'Route',
      match.opponentConfirmedAt
        ? 'Opponent confirmed'
        : 'Escalated — opponent never responded',
      false,
    ),
    // Say so explicitly. A reviewer must not read a missing screenshot as an
    // integration failure when it is the deliberate privacy boundary.
    field(
      'Evidence',
      match.hasEvidence
        ? 'Attached — open in AREUS to view (not public)'
        : 'None attached',
      false,
    ),
  ]

  if (match.notes) {
    fields.push(field('Submitter note', escapeMarkdown(match.notes), false))
  }

  return fitEmbed({
    title: truncate(
      `Match review — ${escapeMarkdown(match.gamemodeName)}`,
      LIMITS.embedTitle,
    ),
    description: match.suspicious
      ? truncate(
          `⚠️ **Flagged for review.** ${escapeMarkdown(match.suspicionReasons ?? 'No reason recorded.')}`,
          LIMITS.embedDescription,
        )
      : undefined,
    color: match.suspicious ? COLOURS.flagged : colour,
    fields,
    footer: { text: `Match ${match.id}` },
    timestamp: match.createdAt.toISOString(),
  })
}

export function buildMatchCard(match: MatchCardInput) {
  return {
    embeds: [matchEmbed(match, COLOURS.pending)],
    components: [
      decisionRow(DISCORD_APPROVAL_KINDS.MATCH, match.id, '/admin/matches'),
    ],
  }
}

// ---------------------------------------------------------------------------
// Resolved cards
// ---------------------------------------------------------------------------

export interface Resolution {
  approved: boolean
  /** Display name of the admin who decided, for the audit trail on the card. */
  decidedBy: string
  reason?: string | null
}

/**
 * What a caller hands to the resolve services.
 *
 * It carries the actor's **id**, not their name, so the name lookup happens
 * behind the "is Discord configured" gate. Passing a name would mean every web
 * approval paid for an extra query even on a deployment with no Discord at all.
 */
export interface ResolutionRequest {
  approved: boolean
  decidedById: string
  reason?: string | null
}

function resolvedFooter(resolution: Resolution, original: Embed): Embed {
  const verdict = resolution.approved ? 'Approved' : 'Rejected'
  const fields = [
    ...original.fields,
    field(
      verdict,
      resolution.reason
        ? `by ${escapeMarkdown(resolution.decidedBy)} — ${escapeMarkdown(resolution.reason)}`
        : `by ${escapeMarkdown(resolution.decidedBy)}`,
      false,
    ),
  ]

  return fitEmbed({
    ...original,
    color: resolution.approved ? COLOURS.approved : COLOURS.rejected,
    fields,
  })
}

/** The card as it looks once decided: outcome recorded, buttons gone. */
export function buildResolvedPlayerCard(
  player: PlayerCardInput,
  resolution: Resolution,
) {
  return {
    embeds: [
      resolvedFooter(
        resolution,
        playerEmbed(
          player,
          resolution.approved ? COLOURS.approved : COLOURS.rejected,
        ),
      ),
    ],
    components: [],
  }
}

export function buildResolvedMatchCard(
  match: MatchCardInput,
  resolution: Resolution,
) {
  return {
    embeds: [
      resolvedFooter(
        resolution,
        matchEmbed(
          match,
          resolution.approved ? COLOURS.approved : COLOURS.rejected,
        ),
      ),
    ],
    components: [],
  }
}

// ---------------------------------------------------------------------------
// Interaction responses
// ---------------------------------------------------------------------------

/**
 * The rejection-reason modal.
 *
 * Exists because `reviewPlayerSchema`/`reviewMatchSchema` require at least 3
 * characters of reason for any non-approval, and a button carries no text. The
 * min/max here mirror those schemas, but they are a courtesy for the person
 * typing — the reason is re-validated server-side on submit.
 */
export function buildRejectModal(
  kind: DiscordApprovalKind,
  targetId: string,
  subject: string,
) {
  return {
    type: 9,
    data: {
      custom_id: encodeApprovalId(
        kind,
        APPROVAL_ACTIONS.REJECT_SUBMIT,
        targetId,
      ),
      title: truncate(`Reject ${subject}`, LIMITS.modalTitle),
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'reason',
              label: truncate('Reason', LIMITS.inputLabel),
              // 2 = paragraph.
              style: 2,
              min_length: 3,
              max_length: 500,
              required: true,
              placeholder: 'The player sees this, so make it understandable.',
            },
          ],
        },
      ],
    },
  }
}

/** A private reply visible only to the admin who clicked. */
export function ephemeral(content: string) {
  return {
    type: 4,
    data: { content: truncate(content, 2000), flags: EPHEMERAL },
  }
}

/** Replaces the card in place — the normal answer to a button click. */
export function updateMessage(body: Record<string, unknown>) {
  return { type: 7, data: body }
}

export const PONG = { type: 1 } as const
