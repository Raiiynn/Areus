import { MATCH_STATUSES, type MatchStatus } from '@/domain/constants'
import { Badge } from '@/components/ui/Badge'

/**
 * Match status, in the player's language rather than the database's.
 *
 * "PENDING_OPPONENT" tells a player nothing; "Awaiting opponent" tells them who
 * they are waiting on.
 */

const presentation: Record<
  MatchStatus,
  { label: string; tone: 'neutral' | 'positive' | 'negative' | 'warning' | 'info' }
> = {
  [MATCH_STATUSES.PENDING_OPPONENT]: {
    label: 'Awaiting opponent',
    tone: 'info',
  },
  [MATCH_STATUSES.PENDING_ADMIN]: { label: 'In review', tone: 'warning' },
  [MATCH_STATUSES.APPROVED]: { label: 'Approved', tone: 'positive' },
  [MATCH_STATUSES.REJECTED]: { label: 'Rejected', tone: 'negative' },
  [MATCH_STATUSES.CANCELLED]: { label: 'Withdrawn', tone: 'neutral' },
}

export function MatchStatusBadge({ status }: { status: string }) {
  const entry = presentation[status as MatchStatus]
  if (!entry) return <Badge tone="neutral">Unknown</Badge>

  return <Badge tone={entry.tone}>{entry.label}</Badge>
}
