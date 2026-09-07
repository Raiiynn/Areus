import { z } from 'zod'

import { MAX_EVIDENCE_BYTES } from '@/domain/constants'

/**
 * Every mutation boundary parses its input through one of these.
 *
 * Schemas live here rather than beside each action so the rules are visible in
 * one place and cannot drift between the client form and the server handler
 * (FULL_BUILD §1854). `.strict()` rejects unknown fields, per MASTER_PROMPT §7.
 */

/**
 * Minecraft usernames: 3–16 characters, letters, digits and underscore.
 * This is Mojang's rule, and AREUS usernames follow it so the two line up.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(16, 'Username must be at most 16 characters.')
  .regex(
    /^[A-Za-z0-9_]+$/,
    'Username may only contain letters, numbers and underscores.',
  )

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.')

/**
 * Password rules: length does more for resistance than character-class rules,
 * so the floor is 10 rather than 8-with-a-symbol.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(200, 'Password must be at most 200 characters.')

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    minecraftUsername: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const loginSchema = z
  .object({
    username: z.string().trim().min(1, 'Enter your username.'),
    password: z.string().min(1, 'Enter your password.'),
  })
  .strict()

export const forgotPasswordSchema = z
  .object({ email: emailSchema })
  .strict()

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

/**
 * Match submission.
 *
 * Note what is absent: the submitter's own identity. It comes from the session
 * (FULL_BUILD §1182) — accepting it here would let anyone submit as anyone.
 */
export const submitMatchSchema = z
  .object({
    opponentUsername: usernameSchema,
    gamemodeSlug: z.string().trim().min(1, 'Choose a gamemode.'),
    submitterScore: z.coerce
      .number()
      .int('Score must be a whole number.')
      .min(0, 'Score cannot be negative.')
      .max(99, 'Score cannot exceed 99.'),
    opponentScore: z.coerce
      .number()
      .int('Score must be a whole number.')
      .min(0, 'Score cannot be negative.')
      .max(99, 'Score cannot exceed 99.'),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must be at most 500 characters.')
      .optional()
      .or(z.literal('')),
  })
  .strict()
  .refine((data) => data.submitterScore !== data.opponentScore, {
    message: 'A match must have a winner. Scores cannot be equal.',
    path: ['opponentScore'],
  })

export const evidenceFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'Attach a screenshot as evidence.')
  .refine(
    (file) => file.size <= MAX_EVIDENCE_BYTES,
    `Screenshot must be ${MAX_EVIDENCE_BYTES / (1024 * 1024)}MB or smaller.`,
  )

/** A reason is mandatory when rejecting, so the player learns why. */
export const reviewMatchSchema = z
  .object({
    matchId: z.string().min(1),
    decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_INFO']),
    reason: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .strict()
  .refine(
    (data) => data.decision === 'APPROVE' || (data.reason ?? '').length >= 3,
    {
      message: 'Give a reason so the player understands the decision.',
      path: ['reason'],
    },
  )

export const confirmMatchSchema = z
  .object({
    matchId: z.string().min(1),
    decision: z.enum(['CONFIRM', 'DISPUTE']),
    reason: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .strict()
  .refine(
    (data) => data.decision === 'CONFIRM' || (data.reason ?? '').length >= 3,
    {
      message: 'Explain why you are disputing this match.',
      path: ['reason'],
    },
  )

export const reviewPlayerSchema = z
  .object({
    userId: z.string().min(1),
    decision: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REINSTATE']),
    reason: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .strict()
  .refine(
    (data) => data.decision === 'APPROVE' || (data.reason ?? '').length >= 3,
    {
      message: 'Give a reason for this decision.',
      path: ['reason'],
    },
  )

export const changeRoleSchema = z
  .object({
    userId: z.string().min(1),
    // Owner is deliberately absent: the owner role is not grantable through
    // the UI, so no path exists to create a second owner by mistake.
    role: z.enum(['PLAYER', 'ADMIN']),
  })
  .strict()

/**
 * Linking a Discord account to an AREUS administrator.
 *
 * A snowflake is a decimal integer of 17-20 digits. Validated as a string
 * rather than a number because it exceeds Number.MAX_SAFE_INTEGER — parsing it
 * would silently corrupt the last digits.
 *
 * An empty string is the unlink case, handled explicitly by the action.
 */
export const linkDiscordSchema = z
  .object({
    discordUserId: z
      .string()
      .trim()
      .regex(/^\d{17,20}$/, 'That is not a Discord user ID.')
      .or(z.literal('')),
  })
  .strict()

export const playerFiltersSchema = z
  .object({
    q: z.string().trim().max(50).optional(),
    gamemode: z.string().trim().max(50).optional(),
    tier: z.string().trim().max(20).optional(),
    sort: z.enum(['rating', 'username', 'matches']).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .partial()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SubmitMatchInput = z.infer<typeof submitMatchSchema>
export type ReviewMatchInput = z.infer<typeof reviewMatchSchema>
export type PlayerFilters = z.infer<typeof playerFiltersSchema>
