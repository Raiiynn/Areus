'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import {
  respondToMatchAction,
  type MatchActionState,
} from '@/server/actions/matches'

/**
 * Opponent confirmation (FULL_BUILD §38).
 *
 * Confirming is one click. Disputing opens a reason field, because a dispute
 * without an explanation gives the reviewer nothing to act on — and the schema
 * requires it server-side regardless of what this form does.
 */

function Actions({ disputing }: { disputing: boolean }) {
  const { pending } = useFormStatus()

  return (
    <div className="flex flex-wrap gap-2">
      {disputing ? (
        <Button
          type="submit"
          name="decision"
          value="DISPUTE"
          variant="danger"
          disabled={pending}
        >
          {pending ? 'Submitting…' : 'Submit dispute'}
        </Button>
      ) : (
        <>
          <Button
            type="submit"
            name="decision"
            value="CONFIRM"
            variant="primary"
            disabled={pending}
          >
            {pending ? 'Confirming…' : 'Confirm result'}
          </Button>
        </>
      )}
    </div>
  )
}

export function MatchResponseForm({ matchId }: { matchId: string }) {
  const [state, formAction] = useActionState<MatchActionState, FormData>(
    respondToMatchAction,
    {},
  )
  const [disputing, setDisputing] = useState(false)

  if (state.success) {
    return <FormSuccess message={state.success} />
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <input type="hidden" name="matchId" value={matchId} />

      {disputing ? (
        <Field
          label="Why are you disputing this?"
          htmlFor={`reason-${matchId}`}
          required
          error={state.fieldErrors?.reason}
          hint="An administrator reads this."
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

      <div className="flex flex-wrap items-center gap-2">
        <Actions disputing={disputing} />

        <Button
          type="button"
          variant={disputing ? 'quiet' : 'danger'}
          onClick={() => setDisputing((value) => !value)}
        >
          {disputing ? 'Cancel' : 'Dispute'}
        </Button>
      </div>
    </form>
  )
}
