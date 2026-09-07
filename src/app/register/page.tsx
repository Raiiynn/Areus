import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/forms/AuthShell'
import { getCurrentUser } from '@/lib/auth/session'

import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = { title: 'Create an account' }

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <AuthShell
      title="Join AREUS"
      description="Register to compete. An administrator reviews every account before it goes live."
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent-strong">
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
