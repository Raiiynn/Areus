import { cn } from '@/lib/cn'

/**
 * Empty states explain what happened and what to do next (FULL_BUILD §1741).
 * A blank panel is a dead end; every empty state that has a next action offers
 * it here.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-sm border border-line text-text-muted"
      >
        —
      </div>
      <p className="font-display text-xl text-text-primary">{title}</p>
      {description ? (
        <p className="max-w-prose text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
