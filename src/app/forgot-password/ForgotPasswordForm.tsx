'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'

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

      {/* No email transport exists in this environment, so the link is shown
          here instead. This block is a development affordance and is removed
          once SMTP is configured. */}
      {state.devResetPath ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium text-warning">
            No email service is configured
          </p>
          <p className="mt-1 text-text-secondary">
            The reset link is shown here for development:
          </p>
          <Link
            href={state.devResetPath}
            className="mt-2 block break-all font-mono text-xs text-accent hover:text-accent-strong"
          >
            {state.devResetPath}
          </Link>
        </div>
      ) : null}

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
