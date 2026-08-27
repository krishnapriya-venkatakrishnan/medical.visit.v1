/** Shown while POST /api/prebrief is in flight (the model call can take a few seconds). */
export function PreBriefSkeleton() {
  return (
    <div className="mt-10 space-y-12" aria-hidden>
      {[0, 1].map((section) => (
        <div key={section} className="space-y-3">
          <div className="h-5 w-52 rounded bg-surface-sunken" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="rounded-card border border-hairline bg-surface p-5 shadow-sm">
              <div className="h-4 w-40 rounded bg-surface-sunken" />
              <div className="mt-3 h-4 w-full rounded bg-surface-sunken" />
              <div className="mt-2 h-4 w-3/4 rounded bg-surface-sunken" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
