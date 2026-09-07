'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import {
  reviewPlayerAction,
  type AdminActionState,
} from '@/server/actions/admin'

type Decision = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REINSTATE'

function Submit({ decision, label }: { decision: Decision; label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={
        decision === 'APPROVE' || decision === 'REINSTATE' ? 'primary' : 'danger'
      }
      size="sm"
      disabled={pending}
    >
      {pending ? '…' : label}
    </Button>
  )
}

/**
 * Registration and account decisions.
 *
 * Anything negative requires a written reason before the button appears — the
 * schema enforces the same rule server-side, so this is a usability affordance
 * rather than the control.
 */
export function PlayerDecisionForm({
  userId,
  decisions,
}: {
  userId: string
  decisions: Array<{ decision: Decision; label: string }>
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(
    reviewPlayerAction,
    {},
  )
  const [showReason, setShowReason] = useState(false)

  if (state.success) return <FormSuccess message={state.success} />

  const negative = decisions.filter(
    (d) => d.decision === 'REJECT' || d.decision === 'SUSPEND',
  )
  const positive = decisions.filter(
    (d) => d.decision === 'APPROVE' || d.decision === 'REINSTATE',
  )

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="userId" value={userId} />

      {showReason ? (
        <Field
          label="Reason"
          htmlFor={`reason-${userId}`}
          required
          hint="The player sees this."
        >
          <Textarea id={`reason-${userId}`} name="reason" maxLength={500} required />
        </Field>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!showReason
          ? positive.map((d) => (
              <Submit key={d.decision} decision={d.decision} label={d.label} />
            ))
          : null}

        {showReason
          ? negative.map((d) => (
              <Submit key={d.decision} decision={d.decision} label={d.label} />
            ))
          : null}

        {negative.length > 0 ? (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => setShowReason((value) => !value)}
          >
            {showReason ? 'Cancel' : negative[0]!.label}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
