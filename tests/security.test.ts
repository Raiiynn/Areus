import { describe, expect, it } from 'vitest'

import { detectImageType } from '@/lib/evidence'
import { isDiscordConfigured } from '@/lib/discord/config'
import {
  hashPassword,
  verifyPassword,
} from '@/lib/auth/password'
import {
  changeRoleSchema,
  linkDiscordSchema,
  loginSchema,
  registerSchema,
  reviewMatchSchema,
  submitMatchSchema,
} from '@/lib/validation/schemas'

/**
 * Security-relevant unit tests (FULL_BUILD §1925).
 *
 * These cover the controls that are pure functions: file-type detection by
 * magic bytes, password hashing, and the validation boundary. The controls that
 * need a database — IDOR, role escalation — are in the other suites.
 */

describe('evidence type detection', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBP', 'ascii'),
  ])

  it('recognises the allowed image formats', () => {
    expect(detectImageType(png)).toBe('png')
    expect(detectImageType(jpeg)).toBe('jpeg')
    expect(detectImageType(webp)).toBe('webp')
  })

  it('rejects an executable disguised as an image', () => {
    // "MZ" — a Windows PE. Renaming it screenshot.png must not help.
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0])
    expect(detectImageType(exe)).toBeNull()
  })

  it('rejects a shell script', () => {
    const script = Buffer.from('#!/bin/sh\nrm -rf /', 'ascii')
    expect(detectImageType(script)).toBeNull()
  })

  it('rejects an SVG, which can carry script', () => {
    const svg = Buffer.from('<svg onload="alert(1)"></svg>', 'ascii')
    expect(detectImageType(svg)).toBeNull()
  })

  it('rejects a GIF, which is not on the allow-list', () => {
    const gif = Buffer.from('GIF89a', 'ascii')
    expect(detectImageType(gif)).toBeNull()
  })

  it('rejects a truncated header without throwing', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull()
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })

  it('rejects a RIFF container that is not WebP', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WAVE', 'ascii'),
    ])
    expect(detectImageType(wav)).toBeNull()
  })
})

describe('password hashing', () => {
  it('never stores the plaintext', async () => {
    const hash = await hashPassword('correct-horse-battery')
    expect(hash).not.toContain('correct-horse-battery')
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct-horse-battery')
    expect(await verifyPassword('correct-horse-battery', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery')
    expect(await verifyPassword('incorrect-horse-battery', hash)).toBe(false)
  })

  it('salts, so identical passwords hash differently', async () => {
    const a = await hashPassword('same-password-here')
    const b = await hashPassword('same-password-here')
    expect(a).not.toBe(b)
  })
})

describe('registration validation', () => {
  const valid = {
    username: 'Aureon',
    email: 'aureon@example.com',
    minecraftUsername: 'Aureon',
    password: 'a-long-enough-password',
    confirmPassword: 'a-long-enough-password',
  }

  it('accepts a well-formed registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: 'something-else-entirely',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects usernames with characters Minecraft does not allow', () => {
    for (const username of ['a b', 'drop;table', '<script>', 'aa', 'a'.repeat(17)]) {
      expect(registerSchema.safeParse({ ...valid, username }).success).toBe(false)
    }
  })

  it('rejects an unknown field rather than ignoring it', () => {
    // Without .strict(), a "role" field would pass validation and only be
    // ignored by luck further down.
    const result = registerSchema.safeParse({ ...valid, role: 'OWNER' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed email', () => {
    expect(
      registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success,
    ).toBe(false)
  })
})

describe('login validation', () => {
  it('rejects an unknown field', () => {
    const result = loginSchema.safeParse({
      username: 'Aureon',
      password: 'whatever',
      isAdmin: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('match submission validation', () => {
  const valid = {
    opponentUsername: 'Bob',
    gamemodeSlug: 'sword',
    submitterScore: 3,
    opponentScore: 1,
  }

  it('accepts a well-formed submission', () => {
    expect(submitMatchSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a draw, because a match must have a winner', () => {
    expect(
      submitMatchSchema.safeParse({ ...valid, opponentScore: 3 }).success,
    ).toBe(false)
  })

  it('rejects negative and non-integer scores', () => {
    expect(
      submitMatchSchema.safeParse({ ...valid, submitterScore: -1 }).success,
    ).toBe(false)
    expect(
      submitMatchSchema.safeParse({ ...valid, submitterScore: 1.5 }).success,
    ).toBe(false)
  })

  it('rejects an absurd score', () => {
    expect(
      submitMatchSchema.safeParse({ ...valid, submitterScore: 100000 }).success,
    ).toBe(false)
  })

  it('has no field for the submitter identity', () => {
    // The whole impersonation defence: identity comes from the session, so an
    // injected submitterId must be rejected outright.
    const result = submitMatchSchema.safeParse({
      ...valid,
      submitterId: 'someone-else',
    })
    expect(result.success).toBe(false)
  })

  it('coerces numeric strings from form data', () => {
    const result = submitMatchSchema.safeParse({
      ...valid,
      submitterScore: '3',
      opponentScore: '1',
    })
    expect(result.success).toBe(true)
  })
})

describe('review validation', () => {
  it('requires a reason when rejecting', () => {
    expect(
      reviewMatchSchema.safeParse({
        matchId: 'm1',
        decision: 'REJECT',
        reason: '',
      }).success,
    ).toBe(false)
  })

  it('does not require a reason when approving', () => {
    expect(
      reviewMatchSchema.safeParse({ matchId: 'm1', decision: 'APPROVE' })
        .success,
    ).toBe(true)
  })

  it('rejects a decision outside the allowed set', () => {
    expect(
      reviewMatchSchema.safeParse({ matchId: 'm1', decision: 'DELETE' }).success,
    ).toBe(false)
  })
})

describe('role change validation', () => {
  it('accepts PLAYER and ADMIN', () => {
    expect(
      changeRoleSchema.safeParse({ userId: 'u1', role: 'ADMIN' }).success,
    ).toBe(true)
    expect(
      changeRoleSchema.safeParse({ userId: 'u1', role: 'PLAYER' }).success,
    ).toBe(true)
  })

  it('refuses OWNER at the schema level', () => {
    // Belt and braces with the service check: OWNER is not grantable at all.
    expect(
      changeRoleSchema.safeParse({ userId: 'u1', role: 'OWNER' }).success,
    ).toBe(false)
  })
})

describe('Discord integration is inert by default', () => {
  it('is switched off unless every credential is present', () => {
    // This is the guarantee that the whole suite stays offline: with no bot
    // token nothing is posted and the interactions endpoint answers 503, so no
    // test needs to mock the network to avoid touching it.
    expect(isDiscordConfigured()).toBe(false)
  })
})

describe('Discord account linking validation', () => {
  it('accepts a snowflake', () => {
    expect(
      linkDiscordSchema.safeParse({ discordUserId: '123456789012345678' })
        .success,
    ).toBe(true)
  })

  it('accepts an empty string as the unlink case', () => {
    expect(linkDiscordSchema.safeParse({ discordUserId: '' }).success).toBe(true)
  })

  it.each(['12345', 'not-a-number', '1234567890123456789012345', '12345678901234567x'])(
    'refuses %s',
    (value) => {
      expect(linkDiscordSchema.safeParse({ discordUserId: value }).success).toBe(
        false,
      )
    },
  )
})
