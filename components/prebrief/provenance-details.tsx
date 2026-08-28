import type { ProvenanceRef } from "@/lib/types";

/**
 * Provenance disclosure: which measurements a claim derives from
 * (non-negotiable #2). A native <details> keeps it keyboard-accessible and
 * no-JS-safe; the open/close is animated with the CSS grid-rows trick
 * (0fr -> 1fr) so height eases in without JavaScript. Reduced motion is honoured.
 *
 * `tone="provisional"` matches the periwinkle of an unverified finding so the
 * disclosure does not visually break out of the card.
 */
export function ProvenanceDetails({
  refs,
  tone = "default",
}: {
  refs: ProvenanceRef[];
  tone?: "default" | "provisional";
}) {
  const summaryColor =
    tone === "provisional"
      ? "text-provisional-fg hover:text-provisional"
      : "text-muted hover:text-ink";

  return (
    <details className="group/prov">
      <summary
        className={`inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium transition-colors [&::-webkit-details-marker]:hidden ${summaryColor}`}
      >
        <span
          aria-hidden
          className="text-[0.9em] transition-transform duration-200 group-open/prov:rotate-90 motion-reduce:transition-none"
        >
          &rsaquo;
        </span>
        <span className="underline decoration-hairline decoration-dotted underline-offset-4 group-hover/prov:decoration-current">
          {refs.length} source{refs.length === 1 ? "" : "s"}
        </span>
      </summary>

      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-open/prov:grid-rows-[1fr] motion-reduce:transition-none">
        <ul className="mt-2 space-y-1 overflow-hidden border-l border-hairline pl-3 text-xs text-muted">
          {refs.map((ref, i) => (
            <li key={`${ref.metric}-${ref.scanDate}-${i}`} className="flex flex-wrap gap-x-2">
              <code className="rounded bg-surface-sunken px-1 py-0.5 text-ink">{ref.metric}</code>
              <span className="tnum text-ink">{ref.value}</span>
              <span className="tnum">· {ref.scanDate}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
