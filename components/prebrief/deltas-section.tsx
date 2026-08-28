import type { Delta } from "@/lib/types";
import { ProvenanceDetails } from "./provenance-details";

const VALENCE: Record<Delta["valence"], string> = {
  improvement: "text-risk-good-fg",
  concern: "text-risk-elevated-fg",
  neutral: "text-muted",
};

const ARROW: Record<Delta["direction"], string> = {
  up: "↑",
  down: "↓",
  unchanged: "→",
};

/**
 * `deltas` is already filtered to grounded deltas by the route - a delta whose
 * displayed values do not tie out to the record goes to the "Caught by
 * reconciler" tray, never here.
 */
export function DeltasSection({
  deltas,
  firstVisit,
}: {
  deltas: Delta[];
  firstVisit: boolean;
}) {
  return (
    <section aria-labelledby="deltas-heading">
      <h2 id="deltas-heading" className="text-lg font-semibold text-ink">
        What changed since last visit
      </h2>

      {deltas.length === 0 ? (
        <p className="mt-4 rounded-card border border-hairline bg-surface p-6 text-sm leading-relaxed text-muted shadow-sm">
          {firstVisit
            ? "First visit, so there is no earlier scan to compare against. Today's scan becomes the baseline."
            : "No material changes since the last scan."}
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {deltas.map((delta) => (
            <li
              key={delta.id}
              className="rounded-card border border-hairline bg-surface p-6 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{delta.metric}</span>
                <span className={`tnum text-sm font-medium ${VALENCE[delta.valence]}`}>
                  <span aria-hidden>{ARROW[delta.direction]} </span>
                  {delta.previousValue} → {delta.currentValue}
                  {delta.unit ? ` ${delta.unit}` : ""}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink">{delta.summary}</p>
              <div className="mt-2">
                <ProvenanceDetails refs={delta.provenance} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
