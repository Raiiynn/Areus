import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthShell } from '@/components/forms/AuthShell'

import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Enter the email on your account and we will create a reset link."
      footer={
        <Link href="/login" className="text-text-secondary hover:text-text-primary">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
