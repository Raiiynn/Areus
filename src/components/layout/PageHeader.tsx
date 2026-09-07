import { cn } from '@/lib/cn'

/** Consistent page frame: gutter, max width and heading rhythm. */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto max-w-content px-4 py-10 md:px-6 md:py-12 lg:px-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  eyebrow?: string
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-2xs font-medium uppercase tracking-[0.25em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-3xl text-text-primary">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-prose text-sm text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

/** Pagination. Always renders the range so the user knows where they are. */
export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  searchParams = {},
}: {
  page: number
  pageCount: number
  total: number
  basePath: string
  searchParams?: Record<string, string | undefined>
}) {
  if (pageCount <= 1) {
    return (
      <p className="border-t border-line px-4 py-3 text-xs text-text-muted">
        {total} {total === 1 ? 'result' : 'results'}
      </p>
    )
  }

  const buildHref = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value)
    }
    params.set('page', String(target))
    return `${basePath}?${params.toString()}`
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t border-line px-4 py-3"
    >
      <p className="tnum text-xs text-text-muted">
        Page {page} of {pageCount} · {total} results
      </p>

      <div className="flex gap-2">
        <PageLink
          href={buildHref(page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          ← Prev
        </PageLink>
        <PageLink
          href={buildHref(page + 1)}
          disabled={page >= pageCount}
          label="Next page"
        >
          Next →
        </PageLink>
      </div>
    </nav>
  )
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs text-text-muted opacity-40"
      >
        {children}
      </span>
    )
  }

  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs text-text-primary transition-colors duration-instant hover:border-line-strong hover:bg-surface-overlay"
    >
      {children}
    </a>
  )
}
