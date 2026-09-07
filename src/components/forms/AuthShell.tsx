import Link from 'next/link'

import { Logo } from '@/components/layout/Logo'

/** Shared frame for the authentication screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-content items-center justify-center px-4 py-12 md:px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block text-text-primary">
          <Logo markClassName="h-12 w-auto" />
        </Link>

        <h1 className="mt-6 font-display text-3xl text-text-primary">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-text-secondary">{description}</p>
        ) : null}

        <div className="mt-8">{children}</div>

        {footer ? (
          <div className="mt-6 border-t border-line pt-6 text-sm text-text-secondary">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Form-level error, announced to assistive technology. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-negative"
    >
      <span aria-hidden="true">▲</span>
      <span>{message}</span>
    </p>
  )
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-md border border-positive/40 bg-positive/10 px-3 py-2 text-sm text-positive"
    >
      <span aria-hidden="true">✓</span>
      <span>{message}</span>
    </p>
  )
}
