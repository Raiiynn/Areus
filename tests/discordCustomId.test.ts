import { describe, expect, it } from 'vitest'

import { DISCORD_APPROVAL_KINDS } from '@/domain/constants'
import {
  APPROVAL_ACTIONS,
  CustomIdError,
  MAX_CUSTOM_ID_LENGTH,
  decodeApprovalId,
  encodeApprovalId,
} from '@/lib/discord/customId'

/**
 * custom_id is the one field of an interaction that an attacker would most
 * like to control, so its parser gets its own suite. Every malformed shape
 * must produce null, never a partially-parsed result.
 */

describe('encodeApprovalId', () => {
  it('round-trips', () => {
    const encoded = encodeApprovalId(
      DISCORD_APPROVAL_KINDS.MATCH,
      APPROVAL_ACTIONS.APPROVE,
      'clx123abc',
    )

    expect(decodeApprovalId(encoded)).toEqual({
      kind: DISCORD_APPROVAL_KINDS.MATCH,
      action: APPROVAL_ACTIONS.APPROVE,
      targetId: 'clx123abc',
    })
  })

  it('stays within Discord limit for a realistic cuid', () => {
    const encoded = encodeApprovalId(
      DISCORD_APPROVAL_KINDS.PLAYER,
      APPROVAL_ACTIONS.REJECT_SUBMIT,
      'c'.repeat(25),
    )
    expect(encoded.length).toBeLessThanOrEqual(MAX_CUSTOM_ID_LENGTH)
  })

  it('throws rather than truncating an over-long id', () => {
    // A truncated id would decode to a different target. Failing loudly here
    // means it surfaces in this test rather than in production.
    expect(() =>
      encodeApprovalId(
        DISCORD_APPROVAL_KINDS.PLAYER,
        APPROVAL_ACTIONS.APPROVE,
        'x'.repeat(MAX_CUSTOM_ID_LENGTH),
      ),
    ).toThrow(CustomIdError)
  })
})

describe('decodeApprovalId', () => {
  const valid = encodeApprovalId(
    DISCORD_APPROVAL_KINDS.PLAYER,
    APPROVAL_ACTIONS.APPROVE,
    'abc',
  )

  it.each([
    ['a non-string', 42],
    ['undefined', undefined],
    ['empty', ''],
    ['a foreign namespace', 'other:v1:PLAYER:approve:abc'],
    ['a future version', 'areus:v2:PLAYER:approve:abc'],
    ['an unknown kind', 'areus:v1:TEAM:approve:abc'],
    ['an unknown action', 'areus:v1:PLAYER:delete:abc'],
    ['a missing segment', 'areus:v1:PLAYER:approve'],
    ['an empty target', 'areus:v1:PLAYER:approve:'],
    ['a smuggled extra segment', 'areus:v1:PLAYER:approve:abc:extra'],
  ])('returns null for %s', (_label, input) => {
    expect(decodeApprovalId(input)).toBeNull()
  })

  it('returns null past the length limit', () => {
    expect(decodeApprovalId(`${valid}${'x'.repeat(MAX_CUSTOM_ID_LENGTH)}`)).toBeNull()
  })
})
