'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, requireOwner } from '@/lib/auth/authorization'
import { changeRoleSchema, reviewPlayerSchema } from '@/lib/validation/schemas'
import { AdminError, changeRole, reviewPlayer } from '@/services/admin'

/**
 * Administrative server actions.
 *
 * The role gate is the first statement in each — before validation, before
 * anything reads the form. An unauthorized caller never reaches the service.
 */

export interface AdminActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
}

export async function reviewPlayerAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const parsed = reviewPlayerSchema.safeParse({
    userId: formData.get('userId'),
    decision: formData.get('decision'),
    reason: formData.get('reason') ?? '',
  })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid submission.' }
  }

  try {
    await reviewPlayer({
      actorId: actor.id,
      userId: parsed.data.userId,
      decision: parsed.data.decision,
      reason: parsed.data.reason || undefined,
    })
  } catch (error) {
    if (error instanceof AdminError) return { error: error.message }
    throw error
  }

  revalidatePath('/admin')
  revalidatePath('/admin/players')
  revalidatePath('/players')

  const past = {
    APPROVE: 'approved',
    REJECT: 'rejected',
    SUSPEND: 'suspended',
    REINSTATE: 'reinstated',
  } as const

  return { success: `Player ${past[parsed.data.decision]}.` }
}

export async function changeRoleAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  // Owner only. An admin reaching this action is refused before validation,
  // which is what makes self-promotion impossible (FULL_BUILD §399).
  const actor = await requireOwner()

  const parsed = changeRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    return { error: 'Invalid role change.' }
  }

  try {
    await changeRole({
      actorId: actor.id,
      userId: parsed.data.userId,
      role: parsed.data.role,
    })
  } catch (error) {
    if (error instanceof AdminError) return { error: error.message }
    throw error
  }

  revalidatePath('/admin/admins')
  revalidatePath('/admin/players')

  return {
    success:
      parsed.data.role === 'ADMIN'
        ? 'Player promoted to administrator.'
        : 'Administrator demoted to player.',
  }
}
