import Link from 'next/link'

import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GamemodeBadge } from '@/components/domain/GamemodeBadge'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { RatingValue } from '@/components/domain/RatingValue'
import { TierBadge } from '@/components/domain/TierBadge'
import { LogoMark } from '@/components/layout/Logo'
import { CountUp } from '@/components/motion/CountUp'
import { Reveal, RevealItem } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/ui/EmptyState'
import { resolveTier } from '@/domain/tiers'
import { listGamemodesWithStats, listTiers } from '@/services/gamemodes'
import { getTopPlayers } from '@/services/players'
import { db } from '@/lib/db'

/**
 * Landing page (FULL_BUILD §30).
 *
 * A server component: the hero, the podium and the gamemode grid are all
 * rendered on the server so the page has meaningful content before any
 * JavaScript runs (§897). Motion is layered on top by two small client
 * components, and the page reads correctly without either.
 */

export const dynamic = 'force-dynamic'

const HOW_IT_WORKS = [
  { step: 'Register', detail: 'Create an account with your Minecraft username.' },
  { step: 'Get approved', detail: 'An administrator verifies your registration.' },
  { step: 'Play', detail: 'Duel a ranked opponent in any active gamemode.' },
  { step: 'Submit evidence', detail: 'Report the result with a screenshot.' },
  { step: 'Opponent confirms', detail: 'They confirm or dispute what you sent.' },
  { step: 'Admin reviews', detail: 'Staff check the evidence before anything counts.' },
  { step: 'Rating updates', detail: 'Only then does the ladder move.' },
]

export default async function HomePage() {
  const [gamemodes, topPlayers, tiers, totals] = await Promise.all([
    listGamemodesWithStats(),
    getTopPlayers(3),
    listTiers(),
    Promise.all([
      db.user.count({ where: { status: 'APPROVED' } }),
      db.match.count({ where: { status: 'APPROVED' } }),
    ]),
  ])

  const [rankedPlayers, verifiedMatches] = totals

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-content items-center gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:px-8">
          <Reveal stagger={0.06}>
            <RevealItem>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
                Competitive ladder
              </p>
            </RevealItem>

            <RevealItem>
              <h1 className="mt-4 font-display text-hero font-semibold leading-[0.95] tracking-tight text-text-primary">
                AREUS
              </h1>
            </RevealItem>

            <RevealItem>
              <p className="mt-4 max-w-prose text-lg text-text-secondary">
                Competitive Minecraft PvP rankings. Every rating change is backed
                by a match with evidence, confirmed by the opponent and reviewed
                by an administrator.
              </p>
            </RevealItem>

            <RevealItem>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/leaderboards" variant="accent" size="lg">
                  View rankings
                </ButtonLink>
                <ButtonLink href="/register" variant="ghost" size="lg">
                  Join AREUS
                </ButtonLink>
              </div>
            </RevealItem>

            <RevealItem>
              <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-line pt-8">
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                    Ranked players
                  </dt>
                  <dd className="tnum mt-1 font-display text-3xl font-semibold text-text-primary">
                    <CountUp value={rankedPlayers} />
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                    Verified matches
                  </dt>
                  <dd className="tnum mt-1 font-display text-3xl font-semibold text-text-primary">
                    <CountUp value={verifiedMatches} />
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wider text-text-muted">
                    Gamemodes
                  </dt>
                  <dd className="tnum mt-1 font-display text-3xl font-semibold text-text-primary">
                    <CountUp value={gamemodes.length} />
                  </dd>
                </div>
              </dl>
            </RevealItem>
          </Reveal>

          {/* The heading already says AREUS, so the logo is decorative and
              hidden from assistive technology. Below lg it is dropped entirely
              rather than shrunk: at that width it would only push the stats
              below the fold. */}
          <LogoMark className="hidden max-w-xs lg:block" />
        </div>
      </section>

      {/* Podium */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-4 py-16 md:px-6 lg:px-8">
          <header className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl text-text-primary">
              Top of the ladder
            </h2>
            <Link
              href="/players"
              className="text-sm text-text-secondary transition-colors duration-instant hover:text-text-primary"
            >
              All players →
            </Link>
          </header>

          {topPlayers.length === 0 ? (
            <EmptyState
              className="mt-6 rounded-md border border-line"
              title="No ranked players yet"
              description="The ladder fills up as soon as the first reviewed matches land."
            />
          ) : (
            <Reveal className="mt-6">
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topPlayers.map((entry) => (
                  <RevealItem as="li" key={entry.id}>
                    <Card interactive className="h-full">
                      <Link
                        href={`/players/${entry.user.username}`}
                        className="flex h-full flex-col gap-4 p-5"
                      >
                        <div className="flex items-center justify-between">
                          {/* Podium position is achievement, so it takes the
                              gem gold rather than the brand periwinkle. */}
                          <span className="tnum font-display text-2xl font-semibold text-gold">
                            #{entry.position}
                          </span>
                          <TierBadge
                            tier={resolveTier(entry.rating, tiers)}
                            size="md"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <PlayerAvatar
                            username={entry.user.minecraftUsername}
                            size={44}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-display text-xl text-text-primary">
                              {entry.user.username}
                            </p>
                            <GamemodeBadge
                              name={entry.gamemode.name}
                              themeToken={entry.gamemode.themeToken}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="mt-auto flex items-baseline justify-between border-t border-line pt-4">
                          <span className="text-2xs uppercase tracking-wider text-text-muted">
                            Rating
                          </span>
                          <RatingValue value={entry.rating} size="lg" />
                        </div>
                      </Link>
                    </Card>
                  </RevealItem>
                ))}
              </ol>
            </Reveal>
          )}
        </div>
      </section>

      {/* Gamemodes */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-4 py-16 md:px-6 lg:px-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-text-primary">
                Gamemodes
              </h2>
              <p className="mt-1 max-w-prose text-sm text-text-secondary">
                Each gamemode keeps its own rating and its own ladder.
              </p>
            </div>
          </header>

          <Reveal className="mt-6">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gamemodes.map((mode) => (
                <RevealItem as="li" key={mode.id}>
                  <Card interactive className="h-full">
                    <Link
                      href={`/gamemodes/${mode.slug}`}
                      className="flex h-full flex-col p-5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: `var(--${mode.themeToken}, var(--mode-default))`,
                          }}
                        />
                        <h3 className="font-display text-xl text-text-primary">
                          {mode.name}
                        </h3>
                      </div>

                      <p className="mt-2 text-sm text-text-secondary">
                        {mode.description}
                      </p>

                      {/* responsive-ok: two short stat cells, ~120px each at 320px */}
                      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                        <div>
                          <dt className="text-2xs uppercase tracking-wider text-text-muted">
                            Top player
                          </dt>
                          <dd className="mt-0.5 truncate text-text-primary">
                            {mode.topPlayer?.username ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-wider text-text-muted">
                            Top rating
                          </dt>
                          <dd className="tnum mt-0.5 text-text-primary">
                            {mode.topRating ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-wider text-text-muted">
                            Ranked
                          </dt>
                          <dd className="tnum mt-0.5 text-text-primary">
                            {mode.rankedPlayers}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-wider text-text-muted">
                            Matches
                          </dt>
                          <dd className="tnum mt-0.5 text-text-primary">
                            {mode.totalMatches}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </Card>
                </RevealItem>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-4 py-16 md:px-6 lg:px-8">
          <h2 className="font-display text-2xl text-text-primary">
            How a rating changes
          </h2>
          <p className="mt-1 max-w-prose text-sm text-text-secondary">
            Nothing moves the ladder until a human has checked it.
          </p>

          <Reveal className="mt-8">
            <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((item, index) => (
                <RevealItem
                  as="li"
                  key={item.step}
                  className="bg-surface-raised p-5"
                >
                  <span className="tnum font-display text-sm text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-display text-lg text-text-primary">
                    {item.step}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {item.detail}
                  </p>
                </RevealItem>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-content px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <div className="rounded-md border border-line bg-surface-raised px-6 py-12 text-center md:px-12">
            <h2 className="font-display text-3xl text-text-primary">
              Earn your place on the ladder
            </h2>
            <p className="mx-auto mt-3 max-w-prose text-text-secondary">
              Registration is reviewed by an administrator before you can
              compete, which is what keeps the rankings worth having.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/register" variant="accent" size="lg">
                Create an account
              </ButtonLink>
              <ButtonLink href="/rules" variant="ghost" size="lg">
                Read the rules
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
