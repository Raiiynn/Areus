'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import {
  changeRoleAction,
  type AdminActionState,
} from '@/server/actions/admin'

function Submit({
  label,
  variant,
}: {
  label: string
  variant: 'primary' | 'danger'
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} size="sm" disabled={pending}>
      {pending ? 'Working…' : label}
    </Button>
  )
}

/**
 * Promote or demote. Owner only — enforced by `requireOwner` in the action, not
 * by whether this component is rendered.
 */
export function RoleChangeForm({
  userId,
  role,
  label,
  variant,
}: {
  userId: string
  role: 'PLAYER' | 'ADMIN'
  label: string
  variant: 'primary' | 'danger'
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(
    changeRoleAction,
    {},
  )

  if (state.success) return <FormSuccess message={state.success} />

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <Submit label={label} variant={variant} />
    </form>
  )
}
