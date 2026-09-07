import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthShell, FormSuccess } from '@/components/forms/AuthShell'
import { getCurrentUser } from '@/lib/auth/session'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  // Someone already signed in has no business on this page.
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  const params = await searchParams

  return (
    <AuthShell
      title="Sign in"
      description="Access your dashboard, submit matches and track your rating."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/register" className="text-accent hover:text-accent-strong">
            Create an account
          </Link>
          <Link
            href="/forgot-password"
            className="text-text-secondary hover:text-text-primary"
          >
            Forgot password?
          </Link>
        </div>
      }
    >
      {params.reset ? (
        <div className="mb-5">
          <FormSuccess message="Your password was reset. Sign in with your new password." />
        </div>
      ) : null}

      <LoginForm />
    </AuthShell>
  )
}
