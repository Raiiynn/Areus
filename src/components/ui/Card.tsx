import { cn } from '@/lib/cn'

/**
 * Card — raised surface with a hairline border. Structure comes from the rule,
 * not from shadow (MASTER.md: only two elevation steps exist).
 */
export function Card({
  className,
  interactive = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border border-line bg-surface-raised',
        interactive &&
          // 1px lift on hover, never a scale: scaling a data row makes the
          // numbers inside it move while they are being read.
          'transition-[border-color,transform] duration-instant ease-out ' +
            'hover:border-line-strong hover:-translate-y-px',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  action,
  description,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-xl text-text-primary">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
