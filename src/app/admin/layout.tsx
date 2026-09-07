import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ROLES } from '@/domain/constants'
import { isOwner } from '@/lib/auth/roles'
import { getCurrentUser } from '@/lib/auth/session'
import { hasAtLeastRole } from '@/lib/auth/roles'
import { LiveRefresh } from '@/components/live/LiveRefresh'

/**
 * Admin section gate.
 *
 * This layout keeps unauthorized users out of the whole subtree, but it is not
 * the security boundary — every admin server action calls `requireAdmin` or
 * `requireOwner` itself. A layout only decides what renders; FULL_BUILD §1340
 * requires the check to sit at the point of effect as well.
 *
 * Unauthorized visitors get 404, not 403: confirming that /admin exists tells
 * an attacker where to aim.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || !hasAtLeastRole(user, ROLES.ADMIN)) {
    redirect('/not-found')
  }

  const owner = isOwner(user)

  const links = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/players', label: 'Players' },
    { href: '/admin/matches', label: 'Match review' },
    ...(owner ? [{ href: '/admin/admins', label: 'Administrators' }] : []),
  ]

  return (
    <div>
      {/* The admin queues are the one place a decision can arrive from outside
          this browser — approved from Discord — so they must not go stale. */}
      <LiveRefresh />

      <div className="border-b border-line bg-surface-raised">
        <div className="mx-auto max-w-content px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3 pt-4">
            <span className="text-2xs font-medium uppercase tracking-[0.25em] text-accent">
              Staff area
            </span>
            <span className="rounded-sm border border-accent/40 bg-accent-dim px-2 py-px text-2xs font-medium uppercase tracking-wider text-accent">
              {user.role}
            </span>
          </div>

          {/* Scrolls inside its own container on narrow screens rather than
              wrapping or pushing the page sideways. */}
          <nav aria-label="Admin" className="-mx-4 mt-3 overflow-x-auto px-4 md:mx-0 md:px-0">
            <ul className="flex w-max gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex h-11 items-center rounded-t-md px-3 text-sm text-text-secondary transition-colors duration-instant hover:bg-surface-overlay hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {children}
    </div>
  )
}
