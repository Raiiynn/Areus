import { cn } from '@/lib/cn'

/**
 * Skeletons are contextual: they mirror the shape of the content that is
 * loading. FULL_BUILD §1723 rules out a bare "Loading..." as an entire
 * experience — which is what the live site does today.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-surface-overlay', className)}
      aria-hidden="true"
    />
  )
}

export function LeaderboardSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading rankings…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-8 w-8 rounded-sm" />
          <Skeleton className="h-4 flex-1 max-w-40" />
          <Skeleton className="ml-auto h-4 w-14" />
          <Skeleton className="h-5 w-6" />
        </div>
      ))}
    </div>
  )
}

export function PlayerCardSkeleton() {
  return (
    <div className="rounded-md border border-line bg-surface-raised p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-sm" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading profile…</span>
      <div className="flex items-center gap-5">
        <Skeleton className="h-20 w-20 rounded-sm" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export function MatchReviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading review queue…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}
