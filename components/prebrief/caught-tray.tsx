import type { RejectedFinding } from "@/lib/api";

/**
 * "Caught by reconciler" - the safety layer made visible. These are findings the
 * model produced that the deterministic reconciler rejected because a cited value
 * did not tie out to the record (or a trend was inconsistent, or a metric did not
 * exist). They never render as clinical content. This is a feature, not an error
 * state: it is the demo's money-shot.
 */
export function CaughtTray({ rejected }: { rejected: RejectedFinding[] }) {
  if (rejected.length === 0) return null;

  return (
    <section aria-labelledby="caught-heading">
      <div className="flex items-center gap-2">
        <h2 id="caught-heading" className="text-lg font-semibold text-ink">
          Caught by reconciler
        </h2>
        <span className="tnum rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-muted">
          {rejected.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Findings the model produced that could not be grounded in the record. Not shown to the
        clinician as clinical content.
      </p>

      <ul className="mt-4 space-y-3">
        {rejected.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-dashed border-hairline bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted line-through">{r.title}</p>
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-risk-priority-fg">
                rejected
              </span>
            </div>
            {r.failedCheck ? (
              <p className="mt-2 text-xs leading-5 text-ink">
                <span className="font-medium">{r.failedCheck.name}:</span> {r.failedCheck.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
