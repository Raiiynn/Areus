import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PortalShell,
  PortalHeading,
  DataNotice,
  Unavailable,
} from '@/components/hardcore/Portal'
import { EventCountdown } from '@/components/hardcore/EventCountdown'
import { getHardcoreSnapshot } from '@/services/hardcore'

export const metadata: Metadata = { title: 'Events' }
export default async function EventsPage() {
  const snapshot = await getHardcoreSnapshot()
  return (
    <PortalShell>
      <PortalHeading
        title="Make memories. Leave a mark."
        eyebrow="THE SEASON CALENDAR"
        description="Community challenges, faction encounters and adventures. Discover what is next in the AREUS world."
      />
      <DataNotice />
      {snapshot.events.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.events.map((event) => (
            <li className="smp-panel p-5" key={event.id}>
              <span className="smp-chip">
                {event.category} · {event.status}
              </span>
              <h2 className="mt-4 font-display text-xl">
                <Link
                  href={`/events/${event.id}`}
                  className="inline-flex min-h-11 items-center text-accent-strong"
                >
                  {event.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm text-text-secondary">
                {event.description}
              </p>
              <p className="mt-4 text-sm">
                <time dateTime={event.startsAt}>
                  {new Date(event.startsAt).toLocaleString('en-GB', {
                    timeZone: 'UTC',
                  })}{' '}
                  UTC
                </time>
              </p>
              {event.status === 'upcoming' && (
                <p className="mt-3 text-xs text-text-secondary">
                  <EventCountdown startsAt={event.startsAt} />
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <section className="smp-panel">
          <h2 className="sr-only">Season events</h2>
          <Unavailable
            title="Your next adventure is still being written"
            description="There are no verified events to display. Confirmed dates, categories and countdowns will appear here when published."
          />
        </section>
      )}
    </PortalShell>
  )
}
