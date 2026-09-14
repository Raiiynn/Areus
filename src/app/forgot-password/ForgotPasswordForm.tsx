'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import { forgotPasswordAction, type ActionState } from '@/server/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Sending…' : 'Send reset link'}
    </Button>
  )
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    forgotPasswordAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      <SubmitButton />
    </form>
  )
}
