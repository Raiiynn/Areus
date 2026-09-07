'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'

import { AUDIT_ACTIONS } from '@/domain/constants'
import { requireAdmin } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { linkDiscordSchema } from '@/lib/validation/schemas'
import { recordAudit } from '@/services/audit'

/**
 * Linking the signed-in administrator's Discord account.
 *
 * Staff only — the role gate is the first statement, before the form is read —
 * because a linked Discord id is what authorises approving from the Discord
 * channel. A player linking one would gain nothing and only widen the surface.
 *
 * This takes the admin's word for which Discord id is theirs. A full OAuth2
 * `identify` handshake would *prove* it, and is the right long-term answer; it
 * is deliberately not built yet because the trust boundary here is already
 * "someone who is an administrator". The realistic failure is a mistyped id,
 * which would hand button access to a stranger — so the id is unique, an audit
 * row is written on every link and unlink, and the mistake is discoverable.
 */

export interface ProfileActionState {
  error?: string
  success?: string
}

export async function linkDiscordAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const actor = await requireAdmin()

  const parsed = linkDiscordSchema.safeParse({
    discordUserId: formData.get('discordUserId') ?? '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid submission.' }
  }

  const discordUserId = parsed.data.discordUserId || null

  try {
    await db.user.update({
      where: { id: actor.id },
      data: { discordUserId },
    })
  } catch (error) {
    // The unique constraint is what stops one Discord account speaking for two
    // AREUS admins, so a collision is a refusal rather than a server error.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { error: 'That Discord account is already linked to someone else.' }
    }
    throw error
  }

  await recordAudit({
    actorId: actor.id,
    action: discordUserId
      ? AUDIT_ACTIONS.LINKED_DISCORD_ACCOUNT
      : AUDIT_ACTIONS.UNLINKED_DISCORD_ACCOUNT,
    targetType: 'User',
    targetId: actor.id,
    metadata: { discordUserId },
  })

  revalidatePath('/profile')

  return {
    success: discordUserId
      ? 'Discord account linked. You can now approve from Discord.'
      : 'Discord account unlinked.',
  }
}
