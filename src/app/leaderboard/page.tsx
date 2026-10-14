import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PortalHeading,
  PortalShell,
  DataNotice,
} from '@/components/hardcore/Portal'
import { SurvivalLeaderboard } from '@/components/hardcore/SurvivalLeaderboard'
import { SURVIVAL_CATEGORIES, type SurvivalCategory } from '@/domain/hardcore'
import { getHardcoreSnapshot } from '@/services/hardcore'

export const metadata: Metadata = { title: 'Survival leaderboard' }

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const [snapshot, params] = await Promise.all([
    getHardcoreSnapshot(),
    searchParams,
  ])
  const category: SurvivalCategory =
    params.category && Object.hasOwn(SURVIVAL_CATEGORIES, params.category)
      ? (params.category as SurvivalCategory)
      : 'survivors'
  return (
    <PortalShell>
      <PortalHeading
        eyebrow="THE ONES WHO ENDURE"
        title="Survival leaderboard"
        description="Every hour survived is earned. Explore the players building a legacy beyond the kill count."
      />
      <DataNotice />
      <SurvivalLeaderboard
        key={category}
        players={snapshot.players}
        seasons={snapshot.season ? [snapshot.season] : []}
        initialCategory={category}
      />
      <Link
        className="inline-flex min-h-11 items-center text-sm text-text-secondary hover:text-accent-strong"
        href="/leaderboards"
      >
        View legacy PvP rankings ↗
      </Link>
    </PortalShell>
  )
}
