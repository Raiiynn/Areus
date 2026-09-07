import { createPublicKey, verify, type KeyObject } from 'node:crypto'

/**
 * Ed25519 verification of Discord interaction requests.
 *
 * This is the entire security boundary of the interactions endpoint: Discord
 * signs `timestamp + rawBody` with its application key, and anything that does
 * not verify is an impostor. It is kept free of database and config imports so
 * it can be unit-tested against a locally generated key pair with no
 * environment set up.
 *
 * Two details that are easy to get wrong and fail closed if you do:
 *
 * - Node's `crypto.verify` takes `null` as the algorithm for Ed25519. Passing
 *   `'ed25519'` throws.
 * - `DISCORD_PUBLIC_KEY` is bare 32-byte hex, not PEM. It is imported as a JWK
 *   because the alternative — hand-prefixing the SPKI DER header — is opaque.
 */

/** Discord rejects anything older than a few minutes; so do we. */
const MAX_SKEW_SECONDS = 300

/**
 * Builds a verification key from bare hex.
 *
 * Returns null rather than throwing on malformed input: this runs at module
 * scope in the caller, and a typo in an env var must not take down the process.
 */
export function publicKeyFromHex(hex: string): KeyObject | null {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null

  try {
    return createPublicKey({
      key: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: Buffer.from(hex, 'hex').toString('base64url'),
      },
      format: 'jwk',
    })
  } catch {
    return null
  }
}

export interface SignatureInput {
  /** The exact bytes Discord signed. Never a re-serialised object. */
  rawBody: Buffer
  signature: string | null
  timestamp: string | null
  publicKeyHex: string
  /** Injectable so the freshness check is testable without faking the clock. */
  now?: Date
}

/**
 * Verifies a Discord interaction signature.
 *
 * Fails closed on every unexpected input — missing headers, non-hex signature,
 * unparseable timestamp, malformed key. There is no branch that returns true
 * without a successful cryptographic check.
 */
export function verifyDiscordSignature(input: SignatureInput): boolean {
  const { rawBody, signature, timestamp, publicKeyHex } = input

  if (!signature || !timestamp) return false
  if (!/^[0-9a-fA-F]+$/.test(signature) || signature.length % 2 !== 0) {
    return false
  }

  // Reject replays before spending a verification. A signature stays valid
  // forever otherwise, so a captured request could be replayed indefinitely.
  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return false
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  if (Math.abs(nowSeconds - sent) > MAX_SKEW_SECONDS) return false

  const key = publicKeyFromHex(publicKeyHex)
  if (!key) return false

  // Concatenated as bytes rather than strings so the comparison is byte-exact
  // whatever the body contains.
  const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody])

  try {
    return verify(null, message, key, Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
