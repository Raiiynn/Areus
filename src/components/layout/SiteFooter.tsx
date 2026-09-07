import Link from 'next/link'

import { Logo } from '@/components/layout/Logo'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between md:px-6 lg:px-8">
        <div>
          <Logo className="text-text-primary" markClassName="h-8 w-auto" />
          <p className="mt-1 max-w-prose text-sm text-text-secondary">
            Competitive Minecraft PvP rankings. Every rating change is backed by
            a reviewed match.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              { href: '/players', label: 'Players' },
              { href: '/gamemodes', label: 'Gamemodes' },
              { href: '/leaderboards', label: 'Leaderboards' },
              { href: '/rules', label: 'Rules' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-text-secondary transition-colors duration-instant hover:text-text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-content px-4 py-4 text-xs text-text-muted md:px-6 lg:px-8">
          Not affiliated with Mojang or Microsoft.
        </div>
      </div>
    </footer>
  )
}
