'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import {
  linkDiscordAction,
  type ProfileActionState,
} from '@/server/actions/profile'

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="primary" size="sm" disabled={pending}>
      {pending ? '…' : label}
    </Button>
  )
}

/**
 * Links this administrator's Discord account.
 *
 * Free text rather than an OAuth button because there is no OAuth flow yet —
 * see the note in `server/actions/profile.ts` for why that is a deliberate v1
 * limitation rather than an oversight. The field is validated as a snowflake on
 * both sides; the server side is the one that counts.
 */
export function LinkDiscordForm({ current }: { current: string | null }) {
  const [state, formAction] = useActionState<ProfileActionState, FormData>(
    linkDiscordAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-3 p-5">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Field
        label="Discord user ID"
        htmlFor="discordUserId"
        hint={
          current
            ? 'Clear the field and save to unlink.'
            : 'Discord → Settings → Advanced → Developer Mode, then right-click your name and Copy User ID.'
        }
      >
        <Input
          id="discordUserId"
          name="discordUserId"
          defaultValue={current ?? ''}
          inputMode="numeric"
          maxLength={20}
          autoComplete="off"
          placeholder="123456789012345678"
        />
      </Field>

      <Submit label={current ? 'Update' : 'Link account'} />
    </form>
  )
}
