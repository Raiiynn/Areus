import type { Metadata, Viewport } from 'next'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { LiveRefresh } from '@/components/live/LiveRefresh'
import { getCurrentUser } from '@/lib/auth/session'
import { countUnread } from '@/services/notifications'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  title: {
    default: 'AREUS — Competitive Minecraft PvP Rankings',
    template: 'AREUS — %s',
  },
  description:
    'Competitive Minecraft PvP rankings. Every rating change is backed by a reviewed match with evidence.',
  openGraph: {
    type: 'website',
    siteName: 'AREUS',
    title: 'AREUS — Competitive Minecraft PvP Rankings',
    description:
      'Competitive Minecraft PvP rankings across nine gamemodes, verified by admin review.',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a12',
  width: 'device-width',
  initialScale: 1,
  // Never block zoom: capping scale is a WCAG 1.4.4 failure.
  maximumScale: 5,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const unread = user ? await countUnread(user.id) : 0

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        {/* Skip link: first focusable element, visible once focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-accent focus:bg-surface-overlay focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>

        <SiteHeader user={user} unreadCount={unread} />

        {/* Signed-in only: a pending player watches their own approval land,
            and the notification badge stays honest. Signed-out pages have
            nothing that can change under them. */}
        {user ? <LiveRefresh /> : null}

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  )
}
