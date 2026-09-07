'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { FormError } from '@/components/forms/AuthShell'
import { resetPasswordAction, type ActionState } from '@/server/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Updating…' : 'Set new password'}
    </Button>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={state.error} />

      {/* The token travels with the form. It is verified server-side against a
          hash, so a tampered value simply fails to match. */}
      <input type="hidden" name="token" value={token} />

      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 10 characters."
        error={state.fieldErrors?.password}
      />

      <TextField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <p className="text-xs text-text-muted">
        Setting a new password signs you out everywhere else.
      </p>

      <SubmitButton />
    </form>
  )
}
