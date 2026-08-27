import type { AuditEvent } from "@/lib/types";
import { formatClockTime } from "@/lib/format";

/**
 * A compact view of the audit log seeded this stage. Stage 5 expands this into
 * the full Audit Trail panel (system suggestions + every clinician action).
 */
export function ActivityList({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-lg font-semibold text-ink">
        Activity
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {[...events].reverse().map((event, i) => (
          <li key={i} className="flex gap-3 text-muted">
            <span className="tnum shrink-0">{formatClockTime(event.at)}</span>
            <span className="text-ink">{event.action}</span>
            <span className="tnum truncate">{event.targetId}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
