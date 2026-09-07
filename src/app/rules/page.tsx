import type { Metadata } from 'next'

import { PageHeader, PageShell } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { GamemodeBadge } from '@/components/domain/GamemodeBadge'
import { listActiveGamemodes } from '@/services/gamemodes'
import {
  OPPONENT_CONFIRMATION_WINDOW_HOURS,
  PROVISIONAL_MATCH_THRESHOLD,
} from '@/domain/constants'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rules',
  description: 'How AREUS matches are submitted, verified and rated.',
}

const CONDUCT = [
  {
    title: 'Use your real username',
    detail:
      'Submit under the account you actually played on. Your identity comes from your signed-in session, so submitting for someone else is not possible.',
  },
  {
    title: 'Provide clear evidence',
    detail:
      'A screenshot must show the final score and both usernames legibly. Cropped, edited or ambiguous evidence is rejected.',
  },
  {
    title: 'Never manipulate results',
    detail:
      'Arranged losses, recycled screenshots and inflated scores all void the match. Repeated attempts result in suspension.',
  },
  {
    title: 'Report honestly, even when you lose',
    detail:
      'Either player may submit a match. The opponent confirms it either way.',
  },
]

export default async function RulesPage() {
  const gamemodes = await listActiveGamemodes()

  return (
    <PageShell>
      <PageHeader
        eyebrow="Competition"
        title="Rules"
        description="What is required of a match before it moves the ladder."
      />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-2xl text-text-primary">Conduct</h2>
            <ul className="mt-4 space-y-4">
              {CONDUCT.map((rule) => (
                <li key={rule.title}>
                  <Card className="p-5">
                    <h3 className="font-display text-lg text-text-primary">
                      {rule.title}
                    </h3>
                    <p className="mt-1 max-w-prose text-sm text-text-secondary">
                      {rule.detail}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-text-primary">
              How a match is verified
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                'A player submits the result with a screenshot.',
                `The named opponent confirms or disputes it. After ${OPPONENT_CONFIRMATION_WINDOW_HOURS} hours without a response, it escalates to an administrator anyway.`,
                'An administrator reviews the evidence and either approves or rejects it. Rejection always carries a reason.',
                'Only on approval do both ratings change, in a single transaction alongside the permanent rating history.',
              ].map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="tnum mt-0.5 shrink-0 font-display text-sm text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="max-w-prose text-sm text-text-secondary">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="font-display text-2xl text-text-primary">Rating</h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <p className="max-w-prose">
                AREUS uses ELO. How much a result is worth depends on the gap
                between the two players: beating someone far above you gains a
                lot, beating someone far below you gains almost nothing.
              </p>
              <p className="max-w-prose">
                Your first {PROVISIONAL_MATCH_THRESHOLD} matches in a gamemode
                are provisional and move your rating roughly twice as fast, so a
                new account reaches its real level quickly.
              </p>
              <p className="max-w-prose">
                Rating is never created or destroyed between two established
                players — whatever the winner gains, the loser loses.
              </p>
            </div>
          </section>
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="font-display text-xl text-text-primary">
              Gamemode rules
            </h2>
            <ul className="mt-4 space-y-4">
              {gamemodes.map((mode) => (
                <li key={mode.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                  <GamemodeBadge
                    name={mode.name}
                    themeToken={mode.themeToken}
                  />
                  <p className="mt-2 text-sm text-text-secondary">
                    {mode.rules}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </PageShell>
  )
}
