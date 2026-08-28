import type { AuditEvent } from "@/lib/types";
import { formatClockTime } from "@/lib/format";

const ACTOR_BADGE: Record<AuditEvent["actor"], string> = {
  system: "bg-surface-sunken text-muted",
  clinician: "bg-accent-tint text-accent",
};

const VERDICT_BADGE: Record<NonNullable<AuditEvent["verdict"]>, string> = {
  grounded: "bg-risk-good-tint text-risk-good-fg",
  flagged: "bg-risk-elevated-tint text-risk-elevated-fg",
  rejected: "bg-risk-priority-tint text-risk-priority-fg",
};

/**
 * The audit log as a table: system suggestions, reconciler verdicts, and every
 * clinician action, newest first. The structured columns (reconciler verdict,
 * finding, outcome) come from fields recorded on each event. Used on the
 * pre-brief screen ("Activity") and the debrief screen ("Audit trail"), reading
 * the same ["prebrief-audit", memberId] log.
 */
export function AuditTable({
  events,
  heading = "Activity",
  caption = "System suggestions, reconciler verdicts, and clinician actions.",
}: {
  events: AuditEvent[];
  heading?: string;
  caption?: string;
}) {
  if (events.length === 0) return null;

  const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));
  const headingId = `${heading.replace(/\s+/g, "-").toLowerCase()}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold text-ink">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-muted">{caption}</p>

      <div className="mt-5 overflow-x-auto rounded-card border border-hairline bg-surface shadow-sm">
        <table className="w-full min-w-152 border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {["Time", "Actor", "Reconciler", "Finding", "Status"].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((event, i) => (
              <tr key={i} className="border-b border-hairline last:border-0">
                <td className="tnum whitespace-nowrap px-4 py-3 align-top text-muted">
                  {formatClockTime(event.at)}
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${ACTOR_BADGE[event.actor]}`}
                  >
                    {event.actor}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  {event.verdict ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_BADGE[event.verdict]}`}
                    >
                      {event.verdict}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top leading-relaxed text-ink">
                  {event.finding ?? "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                  {event.outcome ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
