import type { RejectedItem } from "@/lib/api";

/**
 * "Caught by reconciler" - the safety layer made visible. These are findings and
 * changes (deltas) the model produced that the deterministic reconciler rejected
 * because a cited value did not tie out, a trend was inconsistent, a displayed
 * value was not backed by provenance, or a metric did not exist. They never
 * render as clinical content. This is a feature, not an error state: it is the
 * demo's money-shot.
 */
export function CaughtTray({ rejected }: { rejected: RejectedItem[] }) {
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
        Findings and changes the model produced that could not be grounded in the record. Not
        shown to the clinician as clinical content.
      </p>

      <ul className="mt-4 space-y-3">
        {rejected.map((r) => (
          <li
            key={r.id}
            className="rounded-card border border-dashed border-hairline bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted line-through">{r.title}</p>
              <span className="flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.08em]">
                <span className="text-muted">{r.kind === "delta" ? "change" : "finding"}</span>
                <span className="text-risk-priority-fg">rejected</span>
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
