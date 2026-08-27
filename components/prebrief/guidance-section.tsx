/**
 * Suggested talking points and the draft action plan. Both are starting material
 * for the consultation and are explicitly machine-drafted until the clinician
 * works from them, so the whole block is marked provisional.
 */
export function GuidanceSection({
  talkingPoints,
  draftActionPlan,
}: {
  talkingPoints: string[];
  draftActionPlan: string[];
}) {
  return (
    <section aria-labelledby="guidance-heading" className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 id="guidance-heading" className="text-lg font-semibold text-ink">
          Talking points & draft plan
        </h2>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-provisional-fg">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-provisional" />
          machine-drafted
        </span>
      </div>

      <div className="rounded-card border border-hairline bg-surface p-5 shadow-sm">
        <h3 className="text-sm font-medium text-ink">Suggested talking points</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-ink">
          {talkingPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-card border border-hairline bg-surface p-5 shadow-sm">
        <h3 className="text-sm font-medium text-ink">Draft action plan</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-ink">
          {draftActionPlan.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
