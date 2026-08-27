import type { AuditEvent } from "@/lib/types";
import { formatClockTime } from "@/lib/format";

/**
 * The full audit trail: every system suggestion and every clinician action, in
 * order, with actor and timestamp (non-negotiable #5). Reads the shared
 * ["prebrief-audit", memberId] log.
 */
export function AuditTrail({ events }: { events: AuditEvent[] }) {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section aria-labelledby="audit-heading">
      <h2 id="audit-heading" className="text-lg font-semibold text-ink">
        Audit trail
      </h2>
      <p className="mt-1 text-sm text-muted">
        Every system suggestion and clinician action, with actor and time.
      </p>

      {ordered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No events recorded yet.</p>
      ) : (
        <ol className="mt-4 border-l border-hairline">
          {ordered.map((event, i) => (
            <li key={i} className="relative pl-5 pb-4 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full ${
                  event.actor === "clinician" ? "bg-accent" : "bg-muted"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="tnum text-muted">{formatClockTime(event.at)}</span>
                <span
                  className={`text-xs font-medium uppercase tracking-[0.08em] ${
                    event.actor === "clinician" ? "text-accent" : "text-muted"
                  }`}
                >
                  {event.actor}
                </span>
                <span className="text-ink">{event.action}</span>
              </div>
              <p className="tnum mt-0.5 text-xs text-muted">{event.targetId}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
