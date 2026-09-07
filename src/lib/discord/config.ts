import 'server-only'

/**
 * Discord integration configuration.
 *
 * Read straight from `process.env` with no validation layer, matching the
 * convention already set by `src/lib/db.ts` and `src/app/layout.tsx` — this
 * project has no env schema and adding one for five keys would be a private
 * standard nobody else follows.
 *
 * The important property is that the whole feature is **inert when
 * unconfigured**. `isDiscordConfigured()` gates every outbound call and the
 * interactions endpoint, so a checkout with no Discord credentials — which
 * includes every vitest run — behaves exactly as the app did before this
 * integration existed, with no mocking and no network.
 */

export const discordConfig = {
  /** Bot token. Its presence is what switches the integration on. */
  botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  /** Application public key, bare 32-byte hex. Verifies interaction signatures. */
  publicKey: process.env.DISCORD_PUBLIC_KEY ?? '',
  /** Application id, used to address interaction follow-ups. */
  applicationId: process.env.DISCORD_APPLICATION_ID ?? '',
  /** The one guild whose interactions are honoured. */
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  /** The channel approval cards are posted to. */
  channelId: process.env.DISCORD_APPROVALS_CHANNEL_ID ?? '',
} as const

/**
 * True only when every key needed to both post and receive is present.
 *
 * Deliberately all-or-nothing: a half-configured integration that posts cards
 * whose buttons cannot be verified would be worse than no integration, because
 * the buttons would look live and silently fail.
 */
export function isDiscordConfigured(): boolean {
  return Boolean(
    discordConfig.botToken &&
      discordConfig.publicKey &&
      discordConfig.applicationId &&
      discordConfig.guildId &&
      discordConfig.channelId,
  )
}

export const DISCORD_API_BASE = 'https://discord.com/api/v10'

/** Absolute origin for the "Open in AREUS" link buttons. */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/+$/, '')}${path}`
}
