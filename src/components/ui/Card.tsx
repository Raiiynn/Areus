import { cn } from '@/lib/cn'

/**
 * Card — raised surface with a hairline border. Structure comes from the rule,
 * not from shadow (MASTER.md: only two elevation steps exist).
 */
export function Card({
  className,
  interactive = false,
  edge,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean
  /**
   * A CSS colour for a 2px rule across the top of the card.
   *
   * This exists so a card can be identified before it is read — a gamemode by
   * its mode colour, a podium place by the gem gold. It is only ever passed a
   * colour that already encodes something the card also states in text, so it
   * adds recognition speed without becoming the sole carrier of meaning
   * (WCAG 1.4.1).
   */
  edge?: string
}) {
  return (
    <div
      className={cn(
        // A data card is a carved panel: translucent zinc over the page, a
        // luminous hairline, and an inset highlight along the top edge doing
        // the work a drop shadow would do in a softer language.
        'relative overflow-hidden rounded-lg border border-line bg-surface-raised/85 shadow-1',
        interactive &&
          // 1px lift on hover, never a scale: scaling a data row makes the
          // numbers inside it move while they are being read.
          'transition-[border-color,transform,box-shadow] duration-instant ease-out ' +
            'hover:border-line-strong hover:-translate-y-px hover:shadow-2',
        className,
      )}
      {...props}
    >
      {edge ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: edge }}
        />
      ) : null}
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

/**
 * Frame — a section rendered as a viewport container.
 *
 * The largest of the three surface levels. Where a `Card` holds one record, a
 * frame holds a whole section and marks its bounds with corner registration
 * ticks, which is what gives the language its instrument-panel reading.
 *
 * `ticks` is opt-out rather than always-on: on a short frame the marks land
 * close enough together to read as damage to the border rather than as
 * deliberate registration.
 */
export function Frame({
  className,
  ticks = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ticks?: boolean }) {
  return (
    <div
      className={cn('frame', ticks && 'frame-ticks', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * A small uppercase status marker — the reference's "diagnostic pill".
 *
 * The glow the reference describes is rendered as a static ring rather than a
 * pulse. A pulsing indicator on a page of rankings pulls the eye back on a
 * timer, and nothing here changes often enough to earn that.
 */
export function LabelPill({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'accent' | 'gold'
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'pill-glass inline-flex items-center gap-2 px-3 py-1.5',
        'text-2xs font-medium uppercase tracking-label',
        tone === 'accent' && 'text-accent',
        tone === 'gold' && 'text-gold',
        tone === 'neutral' && 'text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  )
}
