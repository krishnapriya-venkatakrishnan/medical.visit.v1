/**
 * Loading state for the Member Board. Mirrors the card layout so the page does
 * not jump when data arrives. Becomes meaningful in Stage 4 when the readiness
 * headline is fetched live.
 */
export function BoardSkeleton() {
  return (
    <ul
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6 shadow-sm"
        >
          <div className="flex justify-between">
            <div className="h-5 w-28 rounded bg-surface-sunken" />
            <div className="h-4 w-16 rounded bg-surface-sunken" />
          </div>
          <div className="h-4 w-24 rounded bg-surface-sunken" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-surface-sunken" />
            <div className="h-4 w-4/5 rounded bg-surface-sunken" />
          </div>
          <div className="mt-2 h-6 w-32 rounded-full bg-surface-sunken" />
        </li>
      ))}
    </ul>
  );
}
