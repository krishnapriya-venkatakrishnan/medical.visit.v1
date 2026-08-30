/**
 * Plain-language key to the finding states, for a non-technical reviewer. Shown
 * above the findings on both the fixture Pre-Brief screen and the Brief tab.
 */
export function ReconcilerLegend() {
  return (
    <section
      aria-labelledby="legend-heading"
      className="rounded-card border border-hairline bg-surface p-5 shadow-sm"
    >
      <h2 id="legend-heading" className="text-sm font-semibold text-ink">
        How to read this
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        The model drafts the findings. A deterministic checker (the &ldquo;reconciler&rdquo;) then
        ties every claim back to the actual scan before you see it. Each finding is one of:
      </p>

      <ul className="mt-3 space-y-2.5 text-sm leading-6">
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-provisional" />
          <span className="text-ink">
            <span className="font-medium text-provisional-fg">AI · unverified</span> (periwinkle) -
            the model&rsquo;s draft. It stays this colour until you accept, edit, or dismiss it.
            Nothing in this state has been signed off.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-0.5 shrink-0 font-medium text-risk-good-fg">
            ✓
          </span>
          <span className="text-ink">
            <span className="font-medium text-risk-good-fg">reconciled</span> - every number the
            finding cites was found in the scan and matches exactly, and its risk level agrees with
            the one computed from reference ranges.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span
            aria-hidden
            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-risk-elevated-solid"
          />
          <span className="text-ink">
            <span className="font-medium text-risk-elevated-fg">review carefully</span> - the finding
            is still shown, but a soft check flagged it: usually the risk level could not be
            confirmed against a reference range, or the write-up names a number or measurement it did
            not cite as a source. Worth a glance; not an error.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-0.5 shrink-0 font-medium text-risk-priority-fg">
            ✕
          </span>
          <span className="text-ink">
            <span className="font-medium text-risk-priority-fg">Caught by reconciler</span> - the
            model made a claim that did not hold up: a value that does not match the scan, a trend
            going the wrong way, or a measurement that is not in the record. These are kept out of
            the clinical view and listed in their own tray.
          </span>
        </li>
      </ul>

      <p className="mt-3 text-xs text-muted">
        The risk level shown on a finding is always the one computed from reference ranges, never the
        model&rsquo;s.
      </p>
    </section>
  );
}
