import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

import { SESSION_DURATION_DAYS } from '@/domain/constants'
import { db } from '@/lib/db'

/**
 * Session management.
 *
 * The cookie carries an opaque random token. Only its SHA-256 hash is stored,
 * so a leaked database dump does not hand over live sessions. Nothing about the
 * user — id, role, status — is encoded in the cookie: FULL_BUILD §1332 forbids
 * trusting client state, so the role is read from the database on every
 * privileged action.
 */

const COOKIE_NAME = 'areus_session'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Creates a session row and sets the cookie. Returns the raw token. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  )

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  })

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  return token
}

/**
 * The signed-in user, or null.
 *
 * Reads the user fresh on every call rather than caching role/status, so a
 * suspension or demotion takes effect on the next request instead of when the
 * cookie happens to expire.
 */
export async function getCurrentUser() {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })

  if (!session) return null

  if (session.expiresAt <= new Date()) {
    // Clean up as we go rather than relying on a scheduled sweep.
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return session.user
}

/** Destroys the current session, server-side and in the browser. */
export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value

  if (token) {
    // Logout must invalidate server-side, not merely drop the cookie.
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {})
  }

  jar.delete(COOKIE_NAME)
}

/**
 * Invalidates every session belonging to a user.
 * Used after a password reset and when an account is suspended.
 */
export async function destroyAllSessionsFor(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } })
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
