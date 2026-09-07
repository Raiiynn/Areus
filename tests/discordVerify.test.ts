import { describe, expect, it } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'

import {
  publicKeyFromHex,
  verifyDiscordSignature,
} from '@/lib/discord/verify'

/**
 * Signature verification is the entire security boundary of the interactions
 * endpoint: anything that verifies is Discord, anything else is an impostor.
 *
 * A real key pair is generated here rather than mocked. Mocking the crypto
 * would test the mock, and the two mistakes this code exists to avoid — the
 * `null` algorithm argument and the raw-hex key import — would both survive a
 * mocked test happily.
 */

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const raw = publicKey.export({ format: 'jwk' }) as { x: string }
  const hex = Buffer.from(raw.x, 'base64url').toString('hex')
  return { privateKey, hex }
}

function signed(body: string, timestampSeconds: number) {
  const { privateKey, hex } = keyPair()
  const timestamp = String(timestampSeconds)
  const signature = sign(
    null,
    Buffer.concat([Buffer.from(timestamp, 'utf8'), Buffer.from(body, 'utf8')]),
    privateKey,
  ).toString('hex')

  return { hex, timestamp, signature, rawBody: Buffer.from(body, 'utf8') }
}

const NOW = new Date('2026-01-01T00:00:00Z')
const nowSeconds = Math.floor(NOW.getTime() / 1000)

describe('publicKeyFromHex', () => {
  it('imports a bare 32-byte hex key', () => {
    const { hex } = keyPair()
    expect(publicKeyFromHex(hex)).not.toBeNull()
  })

  it('returns null rather than throwing on a malformed key', () => {
    // This runs at module scope in the caller: a typo in an env var must not
    // take the process down.
    expect(publicKeyFromHex('')).toBeNull()
    expect(publicKeyFromHex('not-hex')).toBeNull()
    expect(publicKeyFromHex('ab'.repeat(16))).toBeNull()
  })
})

describe('verifyDiscordSignature', () => {
  it('accepts a genuine signature', () => {
    const { hex, timestamp, signature, rawBody } = signed('{"type":1}', nowSeconds)

    expect(
      verifyDiscordSignature({
        rawBody,
        signature,
        timestamp,
        publicKeyHex: hex,
        now: NOW,
      }),
    ).toBe(true)
  })

  it('rejects a tampered body', () => {
    const { hex, timestamp, signature } = signed('{"type":1}', nowSeconds)

    expect(
      verifyDiscordSignature({
        rawBody: Buffer.from('{"type":2}', 'utf8'),
        signature,
        timestamp,
        publicKeyHex: hex,
        now: NOW,
      }),
    ).toBe(false)
  })

  it('rejects a tampered timestamp', () => {
    const { hex, signature, rawBody } = signed('{"type":1}', nowSeconds)

    expect(
      verifyDiscordSignature({
        rawBody,
        signature,
        timestamp: String(nowSeconds + 1),
        publicKeyHex: hex,
        now: NOW,
      }),
    ).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const { hex, timestamp, signature, rawBody } = signed('{"type":1}', nowSeconds)
    const flipped = `${signature.slice(0, -2)}${signature.endsWith('00') ? '11' : '00'}`

    expect(
      verifyDiscordSignature({
        rawBody,
        signature: flipped,
        timestamp,
        publicKeyHex: hex,
        now: NOW,
      }),
    ).toBe(false)
  })

  it('rejects a signature from a different key', () => {
    const { timestamp, signature, rawBody } = signed('{"type":1}', nowSeconds)
    const other = keyPair()

    expect(
      verifyDiscordSignature({
        rawBody,
        signature,
        timestamp,
        publicKeyHex: other.hex,
        now: NOW,
      }),
    ).toBe(false)
  })

  it('rejects a stale timestamp even when the signature is genuine', () => {
    // Without this a captured request stays replayable forever.
    const stale = nowSeconds - 600
    const { hex, timestamp, signature, rawBody } = signed('{"type":1}', stale)

    expect(
      verifyDiscordSignature({
        rawBody,
        signature,
        timestamp,
        publicKeyHex: hex,
        now: NOW,
      }),
    ).toBe(false)
  })

  it('rejects missing headers', () => {
    const { hex, timestamp, signature, rawBody } = signed('{"type":1}', nowSeconds)

    expect(
      verifyDiscordSignature({ rawBody, signature: null, timestamp, publicKeyHex: hex, now: NOW }),
    ).toBe(false)
    expect(
      verifyDiscordSignature({ rawBody, signature, timestamp: null, publicKeyHex: hex, now: NOW }),
    ).toBe(false)
  })

  it('rejects a non-hex signature without throwing', () => {
    const { hex, timestamp, rawBody } = signed('{"type":1}', nowSeconds)

    expect(
      verifyDiscordSignature({
        rawBody,
        signature: 'zzzz',
        timestamp,
        publicKeyHex: hex,
        now: NOW,
      }),
    ).toBe(false)
  })
})
