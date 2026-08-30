import type { ReactNode } from "react";
import { Code } from "@/components/ui/code";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-ink">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5 text-sm leading-7 text-ink" style={{ listStyleType: "disc" }}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function DecisionsView() {
  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-4xl px-6 py-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Decisions</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
            Scope and rationale
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted">
            What this prototype does, what it deliberately leaves out, and why it is built the way it
            is.
          </p>
        </header>

        <Section title="In scope">
          <Bullets
            items={[
              "The clinical flow on frozen synthetic members: Member Board, Pre-Brief, Debrief (reached from the workspace title).",
              "The same flow on your own data: the Brief tab takes one structured scan file, generates a pre-brief live, and runs the full accept / edit / dismiss review, sign-off, and a drafted debrief.",
              "A longitudinal member record that gets richer every scan.",
              "Reconciliation of findings AND changes (deltas) against the record, with a plain-language key on screen.",
              "An advisory LLM judge for observation claims: it can add caution, never remove it.",
              "A full audit trail of every system suggestion, reconciler verdict, and clinician action.",
              "The verification made visible: the Harness suite tab runs the deterministic checks live in the browser; the Reconciler tab lets you build a finding by hand and watch every check.",
            ]}
          />
        </Section>

        <Section title="Deliberately out of scope">
          <Bullets
            items={[
              "Authentication and accounts.",
              "Real persistence: state lives in the session and resets on reload.",
              "Real PHI: synthetic data only, names obviously fake.",
              "Multi-clinician concurrency, locking, real-time.",
              "PDF or free-text extraction into the record. Input is a structured, shape-validated Scan; the model never parses a document into the record. That is the trust boundary.",
              "A designed mobile experience: the layout degrades but is not tuned for it.",
            ]}
          />
        </Section>

        <Section title="The three decisions that matter">
          <ol className="space-y-4 pl-5 text-sm leading-7 text-ink" style={{ listStyleType: "decimal" }}>
            <li>
              <span className="font-semibold text-ink">
                A deterministic reconciler as the trust layer.
              </span>{" "}
              The model proposes findings; code disposes, by tying every claim to the record.
              Generation and verification are separate layers, not one prompt asked to be careful.
            </li>
            <li>
              <span className="font-semibold text-ink">
                Provenance-gated, clinician-in-the-loop.
              </span>{" "}
              Every claim traces to a source data point, the risk tier is computed from reference
              ranges (never the model&rsquo;s), and nothing reaches the member without clinician
              sign-off. A regulated-industry instinct applied to clinical AI.
            </li>
            <li>
              <span className="font-semibold text-ink">
                Frozen fixtures plus an eval harness as a regression suite,
              </span>{" "}
              with symmetric shape-validation on both sides: the model&rsquo;s output (<Code>Zod</Code>)
              and the uploaded input (<Code>ScanSchema</Code>). Measured by catch rate and
              false-rejection rate, and runnable from the Harness suite tab, not just CI.
            </li>
          </ol>
        </Section>

        <Section title="Why the reconciler matters">
          <p>
            LLM output is plausible but unverifiable. In a clinical setting a fabricated or misquoted
            number, a flipped trend, or an over-escalated risk is a safety and liability problem, not
            a cosmetic one.
          </p>
          <p>
            The reconciler makes every claim auditable and rejects the ungrounded ones before a
            clinician ever sees them. It turns &ldquo;trust the model&rdquo; into &ldquo;verify
            against the record.&rdquo; On screen, a finding is one of: the model&rsquo;s unverified
            draft (periwinkle), reconciled (green, every number tied out), review carefully (a soft
            check flagged it), or caught by the reconciler (a hard check failed, kept out of the
            clinical view).
          </p>
        </Section>

        <Section title="Probabilistic where it helps, deterministic where it counts">
          <p>
            The model is probabilistic. It is strong at choosing what matters, phrasing it well, and
            synthesising across a record. It is not trustworthy for exact values or classification.
          </p>
          <p>
            Deterministic code is exact and auditable. So each layer is given only what it is good
            at: the model selects and explains; code verifies the numbers, the trend direction, and
            the risk tier. That division of labour is the architecture.
          </p>
        </Section>

        <Section title="The flywheel: learning from every clinician edit">
          <p>
            When a clinician edits the drafted debrief before it goes to the member, the edit itself
            is signal. The Debrief view shows a word-level diff between the AI draft and the sent
            version: what was added, cut, or rephrased. Each edit is an implicit correction (too
            alarming, wrong emphasis, a missing caveat), and across many visits those corrections are
            a high-quality, in-domain record of how expert clinicians want the output to differ from
            the raw model.
          </p>
          <p>
            The loop compounds: the model drafts, the clinician corrects, the corrections become
            training and evaluation data, the next model drafts better, and fewer corrections are
            needed. The edit rate itself becomes a quality number that should fall over time.
          </p>
          <p className="text-muted">
            <span className="font-medium text-ink">Built today:</span> the word-level diff is on
            screen the moment the draft is edited, on both the Debrief screen and the Brief tab.
            &ldquo;Sent unchanged&rdquo; is shown when there is nothing to learn. It is display-only;
            nothing is persisted (persistence is out of scope).
          </p>
          <p className="font-medium text-ink">Next, to make it a real signal:</p>
          <Bullets
            items={[
              "Persist each (AI draft, clinician-sent) pair together with the finalised pre-brief that produced it, so every edit is attributable and reviewable.",
              "Aggregate across visits and clinicians into a labelled dataset: an evaluation set first, a preference or fine-tuning signal later.",
              "Track the edit rate and the kinds of edits (softening, adding a caveat, correcting a fact) as a rolling metric per model version.",
              "Close the loop into prompt and model iteration, with the reconciler still gating every regenerated draft before a clinician sees it.",
            ]}
          />
        </Section>
      </div>
    </main>
  );
}
