import { getMembers } from "@/lib/fixtures";

const FLOW = [
  {
    step: "01",
    title: "AI pre-brief",
    body: "The system drafts findings from the visit's synthetic data. Every claim carries provenance back to the exact data points it derives from.",
  },
  {
    step: "02",
    title: "Clinician review",
    body: "Machine-drafted findings render as provisional until a clinician accepts, edits, or dismisses them. The clinician is the decision-maker.",
  },
  {
    step: "03",
    title: "Member debrief",
    body: "Only clinician-signed content is composed into a plain-language debrief for the member. Nothing reaches them without sign-off.",
  },
] as const;

const RISK_TIERS = [
  { name: "Good", solid: "bg-risk-good-solid", tint: "bg-risk-good-tint", fg: "text-risk-good-fg" },
  { name: "Watch", solid: "bg-risk-watch-solid", tint: "bg-risk-watch-tint", fg: "text-risk-watch-fg" },
  {
    name: "Elevated",
    solid: "bg-risk-elevated-solid",
    tint: "bg-risk-elevated-tint",
    fg: "text-risk-elevated-fg",
  },
  {
    name: "Priority",
    solid: "bg-risk-priority-solid",
    tint: "bg-risk-priority-tint",
    fg: "text-risk-priority-fg",
  },
] as const;

export default function Home() {
  const members = getMembers();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Clinician Workspace
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.12] tracking-[-0.02em] text-ink sm:text-5xl">
          A working prototype of the software behind a preventive-health visit.
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted">
          AI-generated pre-brief, clinician-in-the-loop review, and a drafted member debrief. Built
          the way a regulated-systems engineer would build clinical AI.
        </p>
      </header>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {FLOW.map(({ step, title, body }) => (
          <article
            key={step}
            className="rounded-card border border-hairline bg-surface p-6 shadow-sm"
          >
            <span className="tnum text-sm font-medium text-muted">{step}</span>
            <h2 className="mt-2 text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-provisional-border bg-provisional-tint p-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-provisional" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-provisional-fg">
              AI · not yet reviewed
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-provisional-fg">
            Periwinkle is reserved for one job: unverified AI state. When a clinician accepts or
            edits a finding, it resolves to confirmed ink.
          </p>
        </div>

        <div className="rounded-card border border-hairline bg-surface p-6 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
            Risk tiers
          </span>
          <ul className="mt-3 flex flex-wrap gap-2">
            {RISK_TIERS.map(({ name, solid, tint, fg }) => (
              <li
                key={name}
                className={`inline-flex items-center gap-2 rounded-full ${tint} px-3 py-1 text-xs font-medium ${fg}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${solid}`} aria-hidden />
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-16 border-t border-hairline pt-6 text-sm text-muted">
        Stage 1 · <span className="tnum">{members.length}</span> synthetic members loaded and
        schema-validated:{" "}
        {members.map((m, i) => (
          <span key={m.id}>
            {i > 0 ? ", " : ""}
            {m.displayName} ({m.firstVisit ? "first visit" : `${m.scans.length} scans`})
          </span>
        ))}
        .
      </footer>
    </main>
  );
}
