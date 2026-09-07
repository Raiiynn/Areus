import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthShell, FormError } from '@/components/forms/AuthShell'
import { ButtonLink } from '@/components/ui/Button'

import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset password' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <AuthShell title="Reset password">
        <div className="space-y-5">
          <FormError message="This link is missing its reset token." />
          <ButtonLink href="/forgot-password" variant="primary">
            Request a new link
          </ButtonLink>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Set a new password"
      footer={
        <Link href="/login" className="text-text-secondary hover:text-text-primary">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  )
}
