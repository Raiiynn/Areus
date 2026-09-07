import { ButtonLink } from '@/components/ui/Button'
import { PageShell } from '@/components/layout/PageHeader'

export default function NotFound() {
  return (
    <PageShell className="flex min-h-[60vh] items-center">
      <div className="mx-auto max-w-prose text-center">
        <p className="font-display text-4xl text-accent">404</p>
        <h1 className="mt-3 font-display text-3xl text-text-primary">
          That page does not exist
        </h1>
        <p className="mt-3 text-text-secondary">
          The link may be out of date, or the player or gamemode may have been
          removed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="primary">
            Back to home
          </ButtonLink>
          <ButtonLink href="/leaderboards" variant="ghost">
            View rankings
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  )
}
