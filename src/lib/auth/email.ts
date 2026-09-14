import 'server-only'

const siteUrl = process.env.SITE_URL
const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!siteUrl || !apiKey || !from) {
    throw new Error('Password reset email configuration is incomplete.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Reset your AREUS password',
      text: `Reset your password: ${siteUrl}/reset-password?token=${token}\n\nThis link expires in 60 minutes.`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Password reset email failed with status ${response.status}.`)
  }
}