import Link from 'next/link'

import { ButtonLink } from '@/components/ui/Button'
import { Card, Frame, LabelPill } from '@/components/ui/Card'
import { GamemodeBadge } from '@/components/domain/GamemodeBadge'
import { PlayerAvatar } from '@/components/domain/PlayerAvatar'
import { RatingValue } from '@/components/domain/RatingValue'
import { TierBadge } from '@/components/domain/TierBadge'
import { LogoMark } from '@/components/layout/Logo'
import { SectionHeading } from '@/components/layout/PageHeader'
import { CountUp } from '@/components/motion/CountUp'
import { Reveal, RevealItem } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/ui/EmptyState'
import { resolveTier } from '@/domain/tiers'
import { listGamemodesWithStats, listTiers } from '@/services/gamemodes'
import { getTopPlayers } from '@/services/players'
import { cn } from '@/lib/cn'
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
      <section className="relative isolate overflow-hidden border-b border-line">
        {/* The three depth layers, back to front: blueprint grid, then a single
            static wash. The frames themselves are the third. Nothing here
            breathes — see the motion note in tokens.css. */}
        <div aria-hidden="true" className="field-grid" />
        <div
          aria-hidden="true"
          className="wash wash-accent -right-20 -top-24 hidden lg:block"
        />

        <div className="relative mx-auto grid max-w-content items-center gap-10 px-4 py-20 md:px-6 md:py-24 lg:grid-cols-[1.28fr_0.7fr] lg:gap-16 lg:px-8">
          <Reveal stagger={0.06}>
            <RevealItem>
              <LabelPill tone="accent">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                />
                Competitive ladder
              </LabelPill>
            </RevealItem>

            <RevealItem>
              {/* The wordmark is the loudest thing on the site. Bebas Neue is
                  drawn as caps at a single weight, so the impact comes from
                  scale and tight leading rather than from a bold it does not
                  have. */}
              <h1 className="mt-6 font-display text-hero leading-[0.85] text-text-primary">
                AREUS
              </h1>
            </RevealItem>

            <RevealItem>
              <p className="mt-6 max-w-prose border-l border-accent/40 pl-5 text-lg text-text-secondary">
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
              {/* No frame and no dividers. Boxing these three totals put four
                  more rules on a page that already gets its structure from
                  hairlines, and the panel read as clutter rather than as
                  instrumentation. Size and spacing separate them well enough. */}
              <dl className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-10">
                <Stat label="Ranked players" value={rankedPlayers} />
                <Stat label="Verified matches" value={verifiedMatches} />
                <Stat label="Gamemodes" value={gamemodes.length} />
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
        <div className="mx-auto max-w-content px-4 py-20 md:px-6 lg:px-8">
          <SectionHeading
            index={1}
            eyebrow="Standings"
            title="Top of the ladder"
            action={
              <Link
                href="/players"
                className="text-sm text-text-secondary transition-colors duration-instant hover:text-text-primary"
              >
                All players →
              </Link>
            }
          />

          {topPlayers.length === 0 ? (
            <EmptyState
              className="mt-8 rounded-md border border-line"
              title="No ranked players yet"
              description="The ladder fills up as soon as the first reviewed matches land."
            />
          ) : (
            <Reveal className="mt-8">
              {/* A podium, not three equal cards. First place takes the full
                  width of the row on large screens and is set a size larger
                  throughout; the other two sit beneath it. The layout states
                  the ranking before a single number is read — which is what a
                  podium is for, and the reason the previous uniform grid felt
                  flat despite holding the same data. */}
              <ol className="grid gap-4 lg:grid-cols-2">
                {topPlayers.map((entry, index) => {
                  const first = index === 0
                  return (
                    <RevealItem
                      as="li"
                      key={entry.id}
                      className={first ? 'lg:col-span-2' : undefined}
                    >
                      <Card
                        interactive
                        edge={first ? 'var(--gold)' : undefined}
                        className="h-full"
                      >
                        <Link
                          href={`/players/${entry.user.username}`}
                          className={cn(
                            'flex h-full gap-5',
                            first
                              ? 'flex-col p-6 sm:flex-row sm:items-center sm:gap-8'
                              : 'flex-col p-5',
                          )}
                        >
                          <div className="flex items-center justify-between gap-4 sm:shrink-0">
                            {/* Podium position is achievement, so it takes the
                                gem gold rather than the brand periwinkle. */}
                            <span
                              className={cn(
                                'tnum font-display leading-none text-gold',
                                first ? 'text-hero' : 'text-3xl',
                              )}
                            >
                              {entry.position}
                            </span>
                            <TierBadge
                              tier={resolveTier(entry.rating, tiers)}
                              size={first ? 'lg' : 'md'}
                              className="sm:hidden"
                            />
                          </div>

                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <PlayerAvatar
                              username={entry.user.minecraftUsername}
                              size={first ? 64 : 44}
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'truncate font-display text-text-primary',
                                  first ? 'text-3xl' : 'text-xl',
                                )}
                              >
                                {entry.user.username}
                              </p>
                              <GamemodeBadge
                                name={entry.gamemode.name}
                                themeToken={entry.gamemode.themeToken}
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div
                            className={cn(
                              'flex items-baseline justify-between gap-4 border-line',
                              first
                                ? 'border-t pt-4 sm:shrink-0 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0'
                                : 'mt-auto border-t pt-4',
                            )}
                          >
                            <span className="text-2xs uppercase tracking-label text-text-muted">
                              Rating
                            </span>
                            <RatingValue
                              value={entry.rating}
                              size={first ? 'xl' : 'lg'}
                            />
                          </div>

                          {first ? (
                            <TierBadge
                              tier={resolveTier(entry.rating, tiers)}
                              size="lg"
                              className="hidden shrink-0 sm:inline-grid"
                            />
                          ) : null}
                        </Link>
                      </Card>
                    </RevealItem>
                  )
                })}
              </ol>
            </Reveal>
          )}
        </div>
      </section>

      {/* Gamemodes */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-4 py-20 md:px-6 lg:px-8">
          <SectionHeading
            index={2}
            eyebrow="Disciplines"
            title="Gamemodes"
            description="Each gamemode keeps its own rating and its own ladder."
          />

          <Reveal className="mt-8">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gamemodes.map((mode) => (
                <RevealItem as="li" key={mode.id}>
                  {/* The mode colour was a 2px dot, which is too small to
                      identify a card by at a glance. As a top rule it does the
                      job the dot was meant to do; the name below it still
                      carries the meaning on its own. */}
                  <Card
                    interactive
                    edge={`var(--${mode.themeToken}, var(--mode-default))`}
                    className="h-full"
                  >
                    <Link
                      href={`/gamemodes/${mode.slug}`}
                      className="flex h-full flex-col p-5"
                    >
                      <h3 className="font-display text-xl text-text-primary">
                        {mode.name}
                      </h3>

                      <p className="mt-2 text-sm text-text-secondary">
                        {mode.description}
                      </p>

                      {/* responsive-ok: two short stat cells, ~120px each at 320px */}
                      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                        <div>
                          <dt className="text-2xs uppercase tracking-label text-text-muted">
                            Top player
                          </dt>
                          <dd className="mt-0.5 truncate text-text-primary">
                            {mode.topPlayer?.username ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-label text-text-muted">
                            Top rating
                          </dt>
                          <dd className="tnum mt-0.5 text-text-primary">
                            {mode.topRating ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-label text-text-muted">
                            Ranked
                          </dt>
                          <dd className="tnum mt-0.5 text-text-primary">
                            {mode.rankedPlayers}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-label text-text-muted">
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
        <div className="mx-auto max-w-content px-4 py-20 md:px-6 lg:px-8">
          <SectionHeading
            index={3}
            eyebrow="Process"
            title="How a rating changes"
            description="Nothing moves the ladder until a human has checked it."
          />

          {/* The seven steps are one frame, divided — a single instrument
              panel rather than seven floating cards. The dividers are the
              frame's own hairline showing through a 1px gap, so no extra rule
              is introduced to draw them. */}
          <Reveal className="mt-8">
            <ol className="frame frame-ticks grid gap-px overflow-hidden bg-line sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((item, index) => (
                <RevealItem
                  as="li"
                  key={item.step}
                  className="bg-surface-raised/85 p-6"
                >
                  <span className="tnum font-display text-xl text-accent">
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
          <Frame className="isolate overflow-hidden px-6 py-20 text-center md:px-frame">
            {/* The closing panel gets the one gold wash on the page. Gold is
                the achievement colour, and this is the invitation to earn it. */}
            <div
              aria-hidden="true"
              className="wash wash-gold -top-40 left-1/2 -translate-x-1/2"
            />

            <h2 className="relative font-display text-4xl text-text-primary">
              Earn your place on the ladder
            </h2>
            <p className="relative mx-auto mt-4 max-w-prose text-text-secondary">
              Registration is reviewed by an administrator before you can
              compete, which is what keeps the rankings worth having.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/register" variant="accent" size="lg">
                Create an account
              </ButtonLink>
              <ButtonLink href="/rules" variant="ghost" size="lg">
                Read the rules
              </ButtonLink>
            </div>
          </Frame>
        </div>
      </section>
    </>
  )
}

/**
 * One cell of the hero totals strip.
 *
 * The label sits above the figure rather than beside it so the three cells
 * align on a single baseline, which is what makes the row read as an
 * instrument panel instead of three unrelated numbers.
 */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    /* Below sm the cell turns on its side — label left, figure right — so three
       stacked rows cost about as much height as one row of columns did. Three
       narrow columns at 320px would wrap every label onto two lines. */
    <div className="flex items-baseline justify-between gap-4 sm:block">
      <dt className="text-2xs font-medium uppercase tracking-label text-text-muted">
        {label}
      </dt>
      <dd className="tnum font-display text-3xl leading-none text-text-primary sm:mt-3 sm:text-4xl">
        <CountUp value={value} />
      </dd>
    </div>
  )
}
