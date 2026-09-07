'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FormError, FormSuccess } from '@/components/forms/AuthShell'
import { MAX_EVIDENCE_BYTES } from '@/domain/constants'
import {
  submitMatchAction,
  type MatchActionState,
} from '@/server/actions/matches'

interface GamemodeOption {
  slug: string
  name: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="accent"
      size="lg"
      className="w-full sm:w-auto"
      disabled={pending}
    >
      {pending ? 'Submitting…' : 'Submit match'}
    </Button>
  )
}

export function SubmitMatchForm({
  gamemodes,
  username,
}: {
  gamemodes: readonly GamemodeOption[]
  username: string
}) {
  const [state, formAction] = useActionState<MatchActionState, FormData>(
    submitMatchAction,
    {},
  )
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <section className="space-y-5">
        <h2 className="font-display text-xl text-text-primary">Who played</h2>

        {/* The submitter is shown but not editable — identity comes from the
            session, so there is no field here to tamper with. */}
        <div className="rounded-md border border-line bg-surface-sunken px-3 py-3">
          <p className="text-2xs font-medium uppercase tracking-wider text-text-muted">
            Submitting as
          </p>
          <p className="mt-1 text-text-primary">{username}</p>
          <p className="mt-1 text-xs text-text-muted">
            Taken from your account. You cannot submit on someone else&apos;s
            behalf.
          </p>
        </div>

        <Field
          label="Opponent username"
          htmlFor="opponentUsername"
          required
          error={state.fieldErrors?.opponentUsername}
          hint="Their AREUS username. They must be an approved player."
        >
          <Input
            id="opponentUsername"
            name="opponentUsername"
            required
            autoComplete="off"
            invalid={Boolean(state.fieldErrors?.opponentUsername)}
            aria-describedby={
              state.fieldErrors?.opponentUsername
                ? 'opponentUsername-error'
                : 'opponentUsername-hint'
            }
          />
        </Field>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <h2 className="font-display text-xl text-text-primary">The match</h2>

        <Field
          label="Gamemode"
          htmlFor="gamemodeSlug"
          required
          error={state.fieldErrors?.gamemodeSlug}
        >
          <Select
            id="gamemodeSlug"
            name="gamemodeSlug"
            required
            defaultValue=""
            invalid={Boolean(state.fieldErrors?.gamemodeSlug)}
          >
            <option value="" disabled>
              Choose a gamemode…
            </option>
            {/* Options come from the database, so this list can never drift
                from the Gamemodes page — the defect the live site has. */}
            {gamemodes.map((mode) => (
              <option key={mode.slug} value={mode.slug}>
                {mode.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* Single column on mobile: a two-column numeric form on a 320px
            screen is cramped for no benefit (FULL_BUILD §713). */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Your score"
            htmlFor="submitterScore"
            required
            error={state.fieldErrors?.submitterScore}
          >
            <Input
              id="submitterScore"
              name="submitterScore"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              required
              className="tnum"
              invalid={Boolean(state.fieldErrors?.submitterScore)}
            />
          </Field>

          <Field
            label="Opponent score"
            htmlFor="opponentScore"
            required
            error={state.fieldErrors?.opponentScore}
          >
            <Input
              id="opponentScore"
              name="opponentScore"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              required
              className="tnum"
              invalid={Boolean(state.fieldErrors?.opponentScore)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <h2 className="font-display text-xl text-text-primary">Evidence</h2>

        <Field
          label="Screenshot"
          htmlFor="evidence"
          required
          error={state.fieldErrors?.evidence}
          hint={`PNG, JPEG or WebP, up to ${MAX_EVIDENCE_BYTES / (1024 * 1024)}MB. The final score and both usernames must be legible.`}
        >
          <input
            id="evidence"
            name="evidence"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? null)
            }
            aria-describedby={
              state.fieldErrors?.evidence ? 'evidence-error' : 'evidence-hint'
            }
            className="block w-full cursor-pointer rounded-md border border-line bg-surface-sunken text-sm text-text-secondary file:mr-3 file:cursor-pointer file:border-0 file:bg-surface-overlay file:px-4 file:py-3 file:text-sm file:text-text-primary hover:file:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </Field>

        {fileName ? (
          <p className="text-xs text-text-secondary" role="status">
            Selected: <span className="font-mono">{fileName}</span>
          </p>
        ) : null}

        <Field
          label="Notes"
          htmlFor="notes"
          error={state.fieldErrors?.notes}
          hint="Optional. Anything the reviewer should know."
        >
          <Textarea
            id="notes"
            name="notes"
            maxLength={500}
            invalid={Boolean(state.fieldErrors?.notes)}
          />
        </Field>
      </section>

      <div className="border-t border-line pt-8">
        <p className="mb-4 max-w-prose text-sm text-text-secondary">
          Your opponent confirms this next. After that an administrator reviews
          the evidence. Ratings change only once it is approved.
        </p>
        <SubmitButton />
      </div>
    </form>
  )
}
