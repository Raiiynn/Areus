import { forwardRef, useId } from 'react'

import { cn } from '@/lib/cn'

/**
 * Form primitives.
 *
 * Labels are visible and persistent — a placeholder is not a label
 * (FULL_BUILD §1706). Errors are associated with their input via
 * aria-describedby and announced, and carry text rather than colour alone.
 */

const controlBase =
  'w-full rounded-md border bg-surface-sunken px-3 text-text-primary ' +
  'placeholder:text-text-muted transition-colors duration-instant ease-out ' +
  'focus:outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:opacity-40 disabled:cursor-not-allowed'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wider text-text-secondary"
      >
        {label}
        {/* Marked in text, not by colour alone. */}
        {required ? (
          <span className="ml-1 text-text-muted normal-case tracking-normal">
            (required)
          </span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-negative"
        >
          <span aria-hidden="true">▲</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'h-11',
        invalid ? 'border-negative' : 'border-line',
        className,
      )}
      {...props}
    />
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'min-h-24 py-2 leading-relaxed',
        invalid ? 'border-negative' : 'border-line',
        className,
      )}
      {...props}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'h-11 appearance-none pr-8',
        invalid ? 'border-negative' : 'border-line',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

/** Convenience wrapper that wires label, input and error ids together. */
export function TextField({
  label,
  name,
  error,
  hint,
  required,
  ...props
}: {
  label: string
  name: string
  error?: string | undefined
  hint?: string
  required?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId()
  const id = props.id ?? `${name}-${generated}`

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <Input
        id={id}
        name={name}
        required={required}
        invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        {...props}
      />
    </Field>
  )
}
