'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { FormError } from '@/components/forms/AuthShell'
import { registerAction, type ActionState } from '@/server/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="accent"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? 'Creating account…' : 'Create account'}
    </Button>
  )
}

export function RegisterForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    registerAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={state.error} />

      <TextField
        label="Username"
        name="username"
        autoComplete="username"
        required
        hint="3–16 characters. Letters, numbers and underscores."
        error={state.fieldErrors?.username}
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      <TextField
        label="Minecraft username"
        name="minecraftUsername"
        required
        hint="Used for your avatar and to verify match evidence."
        error={state.fieldErrors?.minecraftUsername}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 10 characters."
        error={state.fieldErrors?.password}
      />

      <TextField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <p className="text-xs text-text-muted">
        Your registration is reviewed by an administrator before you can submit
        matches or appear in the rankings.
      </p>

      <SubmitButton />
    </form>
  )
}
