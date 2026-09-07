'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import {
  reviewMatchAction,
  type MatchActionState,
} from '@/server/actions/matches'

function Submit({
  decision,
  label,
  variant,
}: {
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
  label: string
  variant: 'primary' | 'danger' | 'ghost'
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={variant}
      disabled={pending}
    >
      {pending ? 'Working…' : label}
    </Button>
  )
}

/**
 * Admin match decision (FULL_BUILD §1244).
 *
 * Approve is one click. Reject and request-info both open the reason field
 * first, because §1250 requires a reason on rejection — the player is entitled
 * to know why a result was thrown out.
 */
export function MatchReviewForm({ matchId }: { matchId: string }) {
  const [state, formAction] = useActionState<MatchActionState, FormData>(
    reviewMatchAction,
    {},
  )
  const [mode, setMode] = useState<'idle' | 'reject' | 'info'>('idle')

  if (state.success) return <FormSuccess message={state.success} />

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="matchId" value={matchId} />

      {mode !== 'idle' ? (
        <Field
          label={mode === 'reject' ? 'Reason for rejection' : 'What do you need?'}
          htmlFor={`reason-${matchId}`}
          required
          error={state.fieldErrors?.reason}
          hint="Both players see this."
        >
          <Textarea
            id={`reason-${matchId}`}
            name="reason"
            maxLength={500}
            required
            invalid={Boolean(state.fieldErrors?.reason)}
          />
        </Field>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {mode === 'idle' ? (
          <>
            <Submit decision="APPROVE" label="Approve" variant="primary" />
            <Button
              type="button"
              variant="danger"
              onClick={() => setMode('reject')}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode('info')}
            >
              Request info
            </Button>
          </>
        ) : (
          <>
            {mode === 'reject' ? (
              <Submit decision="REJECT" label="Confirm rejection" variant="danger" />
            ) : (
              <Submit
                decision="REQUEST_INFO"
                label="Send request"
                variant="ghost"
              />
            )}
            <Button
              type="button"
              variant="quiet"
              onClick={() => setMode('idle')}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
