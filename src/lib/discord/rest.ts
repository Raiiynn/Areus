import 'server-only'

import { DISCORD_API_BASE, discordConfig } from '@/lib/discord/config'

/**
 * The Discord REST calls this integration makes — three of them.
 *
 * A hand-rolled `fetch` wrapper rather than discord.js: the app has no HTTP
 * client dependency and no Discord library, and pulling in a gateway-capable
 * client to send three requests would be the largest dependency in the project
 * by an order of magnitude.
 *
 * Every outbound body carries `allowed_mentions: { parse: [] }`. Rejection
 * reasons and player-chosen usernames flow into message text, so without it a
 * player could put `@everyone` in a rejection reason and ping the whole server
 * through us.
 */

const TIMEOUT_MS = 5000

export class DiscordError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'DiscordError'
  }
}

type Json = Record<string, unknown>

/** Mentions are never expanded, whatever the payload says. */
function withMentionsSuppressed(body: Json): Json {
  return { ...body, allowed_mentions: { parse: [] } }
}

async function request(
  method: string,
  path: string,
  body: Json,
  auth: string | null,
): Promise<Json> {
  let response: Response

  try {
    response = await fetch(`${DISCORD_API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(withMentionsSuppressed(body)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    // Network failure, DNS, or timeout. Callers treat this the same as a 500.
    throw new DiscordError(
      `Discord request failed: ${error instanceof Error ? error.message : 'unknown'}`,
    )
  }

  if (!response.ok) {
    // Truncated: Discord error bodies can be long, and this ends up in a log.
    const detail = (await response.text().catch(() => '')).slice(0, 300)
    throw new DiscordError(
      `Discord ${method} ${path} returned ${response.status}: ${detail}`,
      response.status,
    )
  }

  return (await response.json().catch(() => ({}))) as Json
}

function botAuth(): string {
  return `Bot ${discordConfig.botToken}`
}

/** Posts an approval card. Returns the new message id. */
export async function createMessage(
  channelId: string,
  body: Json,
): Promise<string> {
  const message = await request(
    'POST',
    `/channels/${channelId}/messages`,
    body,
    botAuth(),
  )

  const id = message.id
  if (typeof id !== 'string') {
    throw new DiscordError('Discord accepted the message but returned no id')
  }

  return id
}

/** Rewrites an existing card — used to clear buttons once a decision lands. */
export async function editMessage(
  channelId: string,
  messageId: string,
  body: Json,
): Promise<void> {
  await request(
    'PATCH',
    `/channels/${channelId}/messages/${messageId}`,
    body,
    botAuth(),
  )
}

/**
 * Edits the message an interaction came from, addressed by interaction token.
 *
 * Deliberately unauthenticated: the interaction token *is* the credential, and
 * sending a bot token here is an error. Only needed if a handler ever defers
 * instead of answering inline.
 */
export async function editInteractionOriginal(
  interactionToken: string,
  body: Json,
): Promise<void> {
  await request(
    'PATCH',
    `/webhooks/${discordConfig.applicationId}/${interactionToken}/messages/@original`,
    body,
    null,
  )
}
