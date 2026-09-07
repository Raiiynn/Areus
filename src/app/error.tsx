'use client'

import { useEffect } from 'react'

import { Button, ButtonLink } from '@/components/ui/Button'
import { PageShell } from '@/components/layout/PageHeader'

/**
 * Global error boundary.
 *
 * The message and stack are deliberately not rendered: FULL_BUILD §1768 forbids
 * exposing internal traces. The digest is safe to show — it is an opaque id the
 * user can quote to an administrator, who can find the real error in the server
 * logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Server-side logging already captured this; this is the client half.
    console.error('Unhandled application error', error.digest)
  }, [error])

  return (
    <PageShell className="flex min-h-[60vh] items-center">
      <div className="mx-auto max-w-prose text-center">
        <p className="font-display text-4xl text-negative">Error</p>
        <h1 className="mt-3 font-display text-3xl text-text-primary">
          Something went wrong
        </h1>
        <p className="mt-3 text-text-secondary">
          This one is on us, not you. Try again — if it keeps happening, quote
          the reference below to an administrator.
        </p>

        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-text-muted">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <ButtonLink href="/" variant="ghost">
            Back to home
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  )
}
