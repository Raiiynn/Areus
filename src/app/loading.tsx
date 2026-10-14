export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="mx-auto max-w-content space-y-6 px-4 py-10 md:px-6"
    >
      <span className="sr-only">Loading page…</span>
      <div
        aria-hidden="true"
        className="h-12 rounded-lg bg-surface-overlay motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="h-64 rounded-xl bg-surface-raised motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 rounded-xl bg-surface-raised motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
