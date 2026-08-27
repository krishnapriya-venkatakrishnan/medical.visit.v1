/**
 * Persistent, unobtrusive disclaimer. Required by CLAUDE.md non-negotiable #3:
 * every screen must state that this is a prototype running on synthetic data and
 * is not a medical device. Rendered once in the root layout.
 */
export function PrototypeDisclaimer() {
  return (
    <div className="w-full border-b border-hairline bg-surface-sunken">
      <p className="mx-auto max-w-6xl px-6 py-1.5 text-center text-xs text-muted">
        Prototype · synthetic data only · not a medical device
      </p>
    </div>
  );
}
