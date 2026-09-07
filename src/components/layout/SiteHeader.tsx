'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@prisma/client'

import { ROLES } from '@/domain/constants'
import { hasAtLeastRole } from '@/lib/auth/roles'
import { cn } from '@/lib/cn'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { Logo } from '@/components/layout/Logo'

/**
 * Site header.
 *
 * Desktop shows the full navigation; below 768px it collapses into a drawer
 * rather than overflowing (FULL_BUILD §493). The drawer traps focus, closes on
 * Escape, and returns focus to the trigger — a menu you can open with a keyboard
 * but not leave is worse than no menu.
 *
 * Which links appear is a convenience, not a control: every route re-checks
 * authorization server-side (FULL_BUILD §1332).
 */

interface NavLink {
  href: string
  label: string
}

const publicLinks: NavLink[] = [
  { href: '/players', label: 'Players' },
  { href: '/gamemodes', label: 'Gamemodes' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/rules', label: 'Rules' },
]

export function SiteHeader({
  user,
  unreadCount,
}: {
  user: Pick<User, 'id' | 'username' | 'minecraftUsername' | 'role' | 'status'> | null
  unreadCount: number
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const staff = user ? hasAtLeastRole(user, ROLES.ADMIN) : false

  const links: NavLink[] = [
    ...publicLinks,
    ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    ...(staff ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  // Close the drawer whenever the route changes, otherwise it stays open over
  // the page the user just navigated to.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    // Captured now, not read during cleanup: by the time cleanup runs the ref
    // may point at a different node, or none.
    const trigger = triggerRef.current

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // The page behind a drawer must not scroll.
    document.body.style.overflow = 'hidden'

    drawerRef.current?.querySelector<HTMLElement>('a[href], button')?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      // Focus goes back where it came from, not to the top of the document.
      ;(trigger ?? previouslyFocused)?.focus()
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-base/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-content items-center gap-4 px-4 md:px-6 lg:px-8">
        <Link href="/" className="text-text-primary">
          {/* 32px — the default, and the tallest ramp step that still leaves
              breathing room inside the header bar. */}
          <Logo />
        </Link>

        <nav aria-label="Main" className="ml-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <NavItem link={link} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative grid h-11 w-11 place-items-center rounded-md text-text-secondary transition-colors duration-instant hover:bg-surface-overlay hover:text-text-primary"
              >
                <span aria-hidden="true">◎</span>
                <span className="sr-only">
                  Notifications{unreadCount > 0 ? `, ${unreadCount} unread` : ''}
                </span>
                {unreadCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="tnum absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-2xs font-bold text-text-inverse"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm text-text-primary transition-colors duration-instant hover:border-line-strong sm:inline-flex"
              >
                <PlayerAvatar username={user.minecraftUsername} size={20} />
                <span className="max-w-24 truncate">{user.username}</span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-md border border-line px-3 text-sm text-text-primary transition-colors duration-instant hover:border-line-strong sm:inline-flex"
            >
              Sign in
            </Link>
          )}

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="grid h-11 w-11 place-items-center rounded-md border border-line text-text-primary transition-colors duration-instant hover:border-line-strong md:hidden"
          >
            <span aria-hidden="true">{open ? '✕' : '☰'}</span>
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 top-14 z-30 bg-surface-base/80 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-nav"
            className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-surface-raised md:hidden"
          >
            <nav aria-label="Mobile">
              <ul className="divide-y divide-line">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'flex min-h-12 items-center px-4 text-base transition-colors duration-instant',
                        pathname.startsWith(link.href)
                          ? 'bg-surface-overlay text-accent'
                          : 'text-text-primary hover:bg-surface-overlay',
                      )}
                      aria-current={
                        pathname.startsWith(link.href) ? 'page' : undefined
                      }
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={user ? '/profile' : '/login'}
                    className="flex min-h-12 items-center px-4 text-base text-text-primary hover:bg-surface-overlay"
                  >
                    {user ? 'My profile' : 'Sign in'}
                  </Link>
                </li>
                {user ? (
                  <li>
                    <Link
                      href="/matches/submit"
                      className="flex min-h-12 items-center px-4 text-base text-accent hover:bg-surface-overlay"
                    >
                      Submit a match
                    </Link>
                  </li>
                ) : (
                  <li>
                    <Link
                      href="/register"
                      className="flex min-h-12 items-center px-4 text-base text-accent hover:bg-surface-overlay"
                    >
                      Join AREUS
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  )
}

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`)

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-11 items-center rounded-md px-3 text-sm transition-colors duration-instant',
        active
          ? 'text-text-primary'
          : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary',
      )}
    >
      {link.label}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 bottom-1.5 h-px bg-accent"
        />
      ) : null}
    </Link>
  )
}
