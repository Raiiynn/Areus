'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireApprovedUser, requireAdmin } from '@/lib/auth/authorization'
import { EvidenceError, storeEvidence } from '@/lib/evidence'
import {
  confirmMatchSchema,
  reviewMatchSchema,
  submitMatchSchema,
} from '@/lib/validation/schemas'
import {
  MatchError,
  cancelMatch,
  respondToMatch,
  reviewMatch,
  submitMatch,
} from '@/services/matches'

/**
 * Match server actions.
 *
 * Each one follows the same shape: authorize, validate, delegate to a service,
 * revalidate. Business rules live in `services/matches.ts` — nothing here
 * decides anything, so the rules stay testable without a request.
 */

export interface MatchActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
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

export async function submitMatchAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  // Approval gate, not just authentication: a pending account cannot compete.
  const user = await requireApprovedUser()

  const raw = {
    opponentUsername: formData.get('opponentUsername'),
    gamemodeSlug: formData.get('gamemodeSlug'),
    submitterScore: formData.get('submitterScore'),
    opponentScore: formData.get('opponentScore'),
    notes: formData.get('notes') ?? '',
  }

  const parsed = submitMatchSchema.safeParse(raw)
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const file = formData.get('evidence')
  if (!(file instanceof File)) {
    return { fieldErrors: { evidence: 'Attach a screenshot as evidence.' } }
  }

  let stored
  try {
    // Validates by magic bytes, not by the client's declared MIME type.
    stored = await storeEvidence(file)
  } catch (error) {
    if (error instanceof EvidenceError) {
      return { fieldErrors: { evidence: error.message } }
    }
    throw error
  }

  try {
    await submitMatch({
      // Identity comes from the session. There is no form field for it.
      submitterId: user.id,
      opponentUsername: parsed.data.opponentUsername,
      gamemodeSlug: parsed.data.gamemodeSlug,
      submitterScore: parsed.data.submitterScore,
      opponentScore: parsed.data.opponentScore,
      notes: parsed.data.notes || undefined,
      evidence: stored,
    })
  } catch (error) {
    if (error instanceof MatchError) return { error: error.message }
    throw error
  }

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  redirect('/matches?submitted=1')
}

export async function respondToMatchAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const user = await requireApprovedUser()

  const parsed = confirmMatchSchema.safeParse({
    matchId: formData.get('matchId'),
    decision: formData.get('decision'),
    reason: formData.get('reason') ?? '',
  })
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  try {
    await respondToMatch({
      matchId: parsed.data.matchId,
      // Ownership is checked in the service against this id, so a crafted
      // matchId belonging to someone else is rejected there.
      opponentId: user.id,
      decision: parsed.data.decision,
      reason: parsed.data.reason || undefined,
    })
  } catch (error) {
    if (error instanceof MatchError) return { error: error.message }
    throw error
  }

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  return {
    success:
      parsed.data.decision === 'CONFIRM'
        ? 'Match confirmed. It is now with an administrator.'
        : 'Match disputed. It will not affect ratings.',
  }
}

export async function cancelMatchAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const user = await requireApprovedUser()
  const matchId = String(formData.get('matchId') ?? '')

  if (!matchId) return { error: 'Missing match reference.' }

  try {
    await cancelMatch({ matchId, submitterId: user.id })
  } catch (error) {
    if (error instanceof MatchError) return { error: error.message }
    throw error
  }

  revalidatePath('/matches')
  return { success: 'Match withdrawn.' }
}

export async function reviewMatchAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  // Admin or owner. requireRole compares privilege rank, so OWNER passes.
  const reviewer = await requireAdmin()

  const parsed = reviewMatchSchema.safeParse({
    matchId: formData.get('matchId'),
    decision: formData.get('decision'),
    reason: formData.get('reason') ?? '',
  })
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  try {
    await reviewMatch({
      matchId: parsed.data.matchId,
      reviewerId: reviewer.id,
      decision: parsed.data.decision,
      reason: parsed.data.reason || undefined,
    })
  } catch (error) {
    if (error instanceof MatchError) return { error: error.message }
    throw error
  }

  revalidatePath('/admin')
  revalidatePath('/admin/matches')
  revalidatePath('/leaderboards')

  const verb =
    parsed.data.decision === 'APPROVE'
      ? 'approved. Ratings have been applied.'
      : parsed.data.decision === 'REJECT'
        ? 'rejected.'
        : 'returned for more information.'

  return { success: `Match ${verb}` }
}
