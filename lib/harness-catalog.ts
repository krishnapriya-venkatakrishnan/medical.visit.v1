/**
 * Documented catalog of the model-facing test cases, rendered read-only by the
 * Harness suite tab (part B). The deterministic reconciler cases are NOT here:
 * those are imported straight from `evals/cases.ts` and run live in the browser.
 *
 * Pure data. No imports, nothing server-only, so a Client Component can render it.
 * `backtick`-wrapped spans in the strings below become inline code chips on screen
 * (see components/ui/code.tsx). Keep the `name` fields plain; they are headings.
 *
 *   plumbing  runs in `npm test` with a fake createMessage (no network).
 *   quality   runs in `npm run eval:model` against the real API (needs a key).
 */

export type HarnessLayer = "plumbing" | "quality";

export interface HarnessCase {
  /** Short imperative name. Rendered plain (no code chips). */
  name: string;
  /** The input or precondition. May contain `backtick`-wrapped code. */
  given: string;
  /** The asserted outcome. May contain `backtick`-wrapped code. */
  expect: string;
  /** One sentence on why this guarantee matters. May contain `backtick`-wrapped code. */
  why: string;
}

export interface HarnessLayerInfo {
  badge: string;
  blurb: string;
  cases: HarnessCase[];
}

export const HARNESS_CATALOG: Record<HarnessLayer, HarnessLayerInfo> = {
  plumbing: {
    badge: "Model plumbing - mocked, runs in CI",
    blurb:
      "The wiring around the model, with a fake `createMessage`. Deterministic, zero network. Proves our code copes with whatever the model returns.",
    cases: [
      {
        name: "Valid JSON on the first try",
        given: "The model returns a well-formed pre-brief on the first attempt.",
        expect: "Parsed and returned, no retry.",
        why: "The happy path must not do extra work or mask a clean first-try success.",
      },
      {
        name: "Invalid then valid retries once",
        given: "The first reply is not JSON; the second is valid.",
        expect: "`createMessage` is called exactly twice; the valid result is returned.",
        why: "One self-correcting retry with the parse error fed back, never a loop.",
      },
      {
        name: "Invalid twice throws, nothing rendered",
        given: "Both replies are unparseable.",
        expect: "`PreBriefGenerationError`; the route surfaces a clean error, no partial content.",
        why: "Unparseable output must never reach the screen as clinical content.",
      },
      {
        name: "Missing provenance is rejected",
        given: "A finding with an empty provenance array.",
        expect: "`FindingSchema` rejects it; generation fails.",
        why: "A claim with no source cannot be reconciled, so it cannot exist.",
      },
      {
        name: "Clinician-only fields are stripped",
        given: "The model includes a `status` of accepted and a `clinicianEdit` on a finding.",
        expect: "Both are dropped; the finding comes back unverified.",
        why: "Only a clinician sets those; the model cannot pre-approve its own output.",
      },
      {
        name: "Fenced JSON is unwrapped",
        given: "The reply is wrapped in a Markdown-style code fence.",
        expect: "The fence is stripped and the inner JSON is parsed.",
        why: "Models often wrap JSON in fences; tolerate it rather than fail.",
      },
      {
        name: "Wrong memberId is overwritten",
        given: "The model echoes a different `memberId` than the one requested.",
        expect: "It is forced back to the real member id.",
        why: "The record identity is ours, not the model's to choose.",
      },
      {
        name: "No key serves the sample",
        given: "`POST /api/prebrief` with no `ANTHROPIC_API_KEY`.",
        expect: "200 with the reconciled built-in sample, `generated: false`, tray populated.",
        why: "The fixture flow stays fully navigable offline, still through the reconciler.",
      },
      {
        name: "Finalised debrief rejects unresolved findings",
        given: "A finalised pre-brief containing a finding that is still unverified or dismissed.",
        expect: "`FinalisedPreBriefSchema` rejects it (400).",
        why: "The debrief may only be drafted from findings a clinician accepted or edited.",
      },
      {
        name: "The advisory judge is downgrade-only",
        given: "The observation judge returns not-supported, or supported, for a claim.",
        expect: "Not-supported moves grounded to flagged; supported never moves flagged back.",
        why: "An advisory LLM check can add caution, never remove it.",
      },
      {
        name: "Rate limit maps to 429, other errors to 502",
        given: "The model call throws a `RateLimitError`, or any other error.",
        expect: "429, or 502, with a clean JSON body and no stack trace.",
        why: "Predictable failure surfaces the client can retry on.",
      },
    ],
  },
  quality: {
    badge: "Model quality - live, needs key",
    blurb:
      "One real generation per fixture member. Asserts properties of the output, not exact prose. Run with `npm run eval:model`; skipped without a key.",
    cases: [
      {
        name: "Output passes the schema, per member",
        given: "A real generation for each fixture member.",
        expect: "`PreBriefSchema` parses it successfully.",
        why: "Shape is the floor; nothing downstream runs on malformed output.",
      },
      {
        name: "Every finding reconciles to grounded or flagged",
        given: "Each finding from a real generation, run through `reconcile()`.",
        expect: "The verdict is grounded or flagged, never rejected.",
        why: "On faithful synthetic data the model should copy values exactly; a rejection means it fabricated.",
      },
      {
        name: "A first-visit member has no deltas and no trend claims",
        given: "A member with a single scan on record.",
        expect: "`deltas` is empty and there are zero trend claims.",
        why: "There is no prior scan to compare against; a trend would be invented.",
      },
      {
        name: "Every claim.metric resolves to a real path",
        given: "Each claim's `metric`, and each delta provenance metric.",
        expect: "It resolves to an actual value in the record at that scan date.",
        why: "A claim pointing at a non-existent path is a hallucinated metric.",
      },
      {
        name: "Observation claims only where there is no number to check",
        given: "Each `observation` claim in the output.",
        expect: "Its metric is not a plain number that has a reference range.",
        why: "`observation` is the unverifiable escape hatch; it must not dodge the numeric checks.",
      },
    ],
  },
};
