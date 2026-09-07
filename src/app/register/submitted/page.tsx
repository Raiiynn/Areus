import type { Metadata } from 'next'

import { AuthShell } from '@/components/forms/AuthShell'
import { ButtonLink } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Registration received' }

export default function RegistrationSubmittedPage() {
  return (
    <AuthShell
      title="Registration received"
      description="Your account exists, but it is not active yet."
    >
      <div className="space-y-6">
        <ol className="space-y-4">
          {[
            {
              label: 'Submitted',
              detail: 'We have your registration.',
              done: true,
            },
            {
              label: 'Awaiting review',
              detail: 'An administrator checks your Minecraft username.',
              done: false,
            },
            {
              label: 'Approved',
              detail: 'You can submit matches and enter the rankings.',
              done: false,
            },
          ].map((step) => (
            <li key={step.label} className="flex gap-3">
              <span
                aria-hidden="true"
                className={
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-2xs ' +
                  (step.done
                    ? 'border-positive text-positive'
                    : 'border-line text-text-muted')
                }
              >
                {step.done ? '✓' : '·'}
              </span>
              <div>
                <p className="text-sm text-text-primary">
                  {step.label}
                  {step.done ? (
                    <span className="sr-only"> — complete</span>
                  ) : (
                    <span className="sr-only"> — pending</span>
                  )}
                </p>
                <p className="text-sm text-text-secondary">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-sm text-text-secondary">
          You can sign in now to check your status, but competitive features stay
          locked until an administrator approves the account.
        </p>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/login" variant="primary">
            Sign in
          </ButtonLink>
          <ButtonLink href="/leaderboards" variant="ghost">
            View rankings
          </ButtonLink>
        </div>
      </div>
    </AuthShell>
  )
}
