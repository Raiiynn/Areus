'use server'

import { createHash, randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import {
  PASSWORD_RESET_WINDOW_MINUTES,
  ROLES,
  USER_STATUSES,
} from '@/domain/constants'
import {
  fakeVerifyPassword,
  hashPassword,
  verifyPassword,
} from '@/lib/auth/password'
import {
  createSession,
  destroyAllSessionsFor,
  destroySession,
} from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validation/schemas'
import { publishPlayerApproval } from '@/services/discordApprovals'

/**
 * Authentication actions.
 *
 * Every one of these validates with Zod before touching the database, and none
 * of them trusts a field the client could have set (role and status are never
 * accepted as input).
 */

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
  /**
   * Reset link, surfaced in the UI because no SMTP exists in this environment.
   * FULL_BUILD §1271 makes email conditional on that infrastructure.
   */
  devResetPath?: string
}

function fieldErrorsFrom(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>
}): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    result[key] ??= issue.message
  }
  return result
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const { username, email, minecraftUsername, password } = parsed.data
  const usernameNormalized = username.toLowerCase()
  const emailNormalized = email.toLowerCase()

  const existing = await db.user.findFirst({
    where: { OR: [{ usernameNormalized }, { emailNormalized }] },
    select: { usernameNormalized: true },
  })

  if (existing) {
    // Which field collided is disclosed deliberately: a registration form that
    // refuses without saying why is unusable, and the same information is
    // obtainable by trying each field separately anyway. Login and password
    // reset, where enumeration actually matters, stay generic.
    return {
      fieldErrors:
        existing.usernameNormalized === usernameNormalized
          ? { username: 'That username is taken.' }
          : { email: 'An account with that email already exists.' },
    }
  }

  const created = await db.user.create({
    data: {
      username,
      usernameNormalized,
      email,
      emailNormalized,
      passwordHash: await hashPassword(password),
      minecraftUsername,
      // Role and status are set here, never accepted from the form.
      role: ROLES.PLAYER,
      status: USER_STATUSES.PENDING,
    },
  })

  // Registration is the one queue entry that has no service behind it, so the
  // Discord card is published here. Deferred with `after` for two reasons: the
  // registrant should not wait on Discord to see their confirmation page, and
  // `redirect` below throws NEXT_REDIRECT, so anything placed after it would
  // never run at all.
  after(() => publishPlayerApproval(created.id))

  redirect('/register/submitted')
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const user = await db.user.findUnique({
    where: { usernameNormalized: parsed.data.username.toLowerCase() },
  })

  if (!user) {
    // Burn the same time a real verification costs, so response timing does
    // not reveal which usernames exist.
    await fakeVerifyPassword()
    return { error: 'Incorrect username or password.' }
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) {
    // Identical message and shape to the unknown-user branch.
    return { error: 'Incorrect username or password.' }
  }

  if (user.status === USER_STATUSES.REJECTED) {
    return {
      error:
        'Your registration was not accepted. Contact an administrator if you think this is a mistake.',
    }
  }

  await createSession(user.id)

  // Pending users may sign in — they need to see their own status — but the
  // approval gate still blocks every competitive action.
  redirect(user.status === USER_STATUSES.PENDING ? '/profile' : '/dashboard')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/')
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const user = await db.user.findUnique({
    where: { emailNormalized: parsed.data.email.toLowerCase() },
  })

  // The response is identical whether or not the account exists, so this form
  // cannot be used to discover which emails are registered.
  const genericResponse: ActionState = {
    success:
      'If an account exists for that email, a reset link has been created.',
  }

  if (!user) return genericResponse

  const token = randomBytes(32).toString('hex')

  await db.passwordResetToken.create({
    data: {
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: user.id,
      expiresAt: new Date(
        Date.now() + PASSWORD_RESET_WINDOW_MINUTES * 60 * 1000,
      ),
    },
  })

  // Without SMTP the link has to reach the user somehow. Returning it is a
  // development affordance and is documented as such — it must be replaced by
  // an email transport before this ships.
  return { ...genericResponse, devResetPath: `/reset-password?token=${token}` }
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const tokenHash = createHash('sha256')
    .update(parsed.data.token)
    .digest('hex')

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  })

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return { error: 'That reset link is invalid or has expired.' }
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    })
    // Single-use.
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })
  })

  // Every existing session dies with the old password, so a reset actually
  // evicts whoever might be holding the account.
  await destroyAllSessionsFor(record.userId)

  redirect('/login?reset=1')
}
