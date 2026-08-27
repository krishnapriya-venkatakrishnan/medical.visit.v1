import type { Debrief } from "@/lib/types";
import { diffWords, changed, type DiffSegment } from "@/lib/diff";

/**
 * The flywheel teaching signal: the diff between the AI draft debrief and the
 * version the clinician sent. This is the data the model would learn from.
 */

type FieldKey = keyof Omit<Debrief, "memberId">;

const FIELD_LABEL: Record<FieldKey, string> = {
  greeting: "Greeting",
  summary: "Summary",
  whatsGood: "What's good",
  whatToWatch: "What to watch",
  actionPlan: "Action plan",
  closing: "Closing",
};

const FIELDS: FieldKey[] = ["greeting", "summary", "whatsGood", "whatToWatch", "actionPlan", "closing"];

function asText(value: string | string[]): string {
  return Array.isArray(value) ? value.join("\n") : value;
}

function Segments({ segments }: { segments: DiffSegment[] }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {segments.map((seg, i) => {
        if (seg.kind === "same") return <span key={i}>{seg.text}</span>;
        if (seg.kind === "add")
          return (
            <span key={i} className="rounded bg-risk-good-tint text-risk-good-fg">
              {seg.text}
            </span>
          );
        return (
          <span key={i} className="rounded bg-risk-priority-tint text-risk-priority-fg line-through">
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}

export function FlywheelDiff({ draft, current }: { draft: Debrief; current: Debrief }) {
  const changedFields = FIELDS.filter((f) => changed(asText(draft[f]), asText(current[f])));

  return (
    <section aria-labelledby="flywheel-heading">
      <div className="flex items-center gap-2">
        <h2 id="flywheel-heading" className="text-lg font-semibold text-ink">
          Flywheel teaching signal
        </h2>
        <span className="text-xs text-muted">what the clinician changed</span>
      </div>

      {changedFields.length === 0 ? (
        <p className="mt-3 rounded-card border border-hairline bg-surface p-5 text-sm text-muted shadow-sm">
          The draft was sent unchanged.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {changedFields.map((field) => (
            <div
              key={field}
              className="rounded-card border border-hairline bg-surface p-5 shadow-sm"
            >
              <h3 className="text-sm font-medium text-ink">{FIELD_LABEL[field]}</h3>
              <div className="mt-2">
                <Segments segments={diffWords(asText(draft[field]), asText(current[field]))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
