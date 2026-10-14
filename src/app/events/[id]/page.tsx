import { notFound } from 'next/navigation'
import {
  PortalHeading,
  PortalShell,
  PortalPanel,
} from '@/components/hardcore/Portal'
import { EventCountdown } from '@/components/hardcore/EventCountdown'
import { getHardcoreSnapshot } from '@/services/hardcore'

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const snapshot = await getHardcoreSnapshot()
  const event = snapshot.events.find((item) => item.id === id)
  if (!event) notFound()
  return (
    <PortalShell>
      <PortalHeading
        eyebrow={`${event.category} / ${event.status}`}
        title={event.title}
        description={event.description}
      />
      <PortalPanel title="Event schedule">
        <div className="space-y-4 p-5">
          <p>
            <time dateTime={event.startsAt}>
              {new Date(event.startsAt).toLocaleString('en-GB', {
                timeZone: 'UTC',
              })}{' '}
              UTC
            </time>
          </p>
          {event.status === 'upcoming' && (
            <EventCountdown startsAt={event.startsAt} />
          )}
          <p className="text-sm text-text-secondary">
            Participation and connection information are shared through approved
            private channels.
          </p>
        </div>
      </PortalPanel>
    </PortalShell>
  )
}
