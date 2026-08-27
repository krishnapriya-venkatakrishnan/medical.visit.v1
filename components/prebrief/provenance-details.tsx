import type { ProvenanceRef } from "@/lib/types";

/**
 * Provenance disclosure: which measurements a claim derives from
 * (non-negotiable #2). A native <details> is used so it is keyboard-accessible
 * and works without JS; Stage 6 makes the open/close feel more crafted.
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
    tone === "provisional" ? "text-provisional-fg" : "text-muted hover:text-ink";

  return (
    <details className="group">
      <summary
        className={`inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium ${summaryColor}`}
      >
        <span aria-hidden className="transition-transform group-open:rotate-90 motion-reduce:transition-none">
          ›
        </span>
        {refs.length} source{refs.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-2 space-y-1 border-l border-hairline pl-3 text-xs text-muted">
        {refs.map((ref, i) => (
          <li key={`${ref.source}-${ref.scanDate}-${i}`} className="flex flex-wrap gap-x-2">
            <code className="rounded bg-surface-sunken px-1 py-0.5 text-ink">{ref.source}</code>
            <span className="tnum text-ink">{ref.value}</span>
            <span className="tnum">· {ref.scanDate}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
