# brief

A working prototype of the software behind a preventive-health visit:

> AI-generated **pre-brief** before the member arrives, a **clinician-in-the-loop**
> review where the clinician is always the decision-maker, and a drafted member
> **debrief** afterwards.

Built the way a regulated-systems engineer would build clinical AI.

> **This is a prototype, not a medical device.** It runs on synthetic data only.
> No real personal or health data. Names are obviously fake. A disclaimer to that
> effect is fixed to every screen.

## Thesis: reconciled, clinician-in-the-loop clinical AI

Generation is a commodity: a POST to the model. The engineering is the
**deterministic reconciler** (`lib/reconcile.ts`) that sits between the model and
the clinician. The model chooses which findings to surface and writes the prose.
It does **not** decide whether a number is real, which way a trend goes, or how
risky something is. Those are computed from the record.

Provenance you can *display*; grounding you have to *compute*. Every finding
**and every delta** the model produces is run through `reconcile()` /
`reconcileDelta()` against the record.

Findings, check pipeline:

| Check | Failure |
| --- | --- |
| **referential integrity** - every cited metric path and scan date exists | rejected |
| **value tie-out** - the cited value exactly equals the record | rejected |
| **trend consistency** - a "trend" claim's direction matches `sign(to - from)` recomputed from the record | rejected |
| **tier derivation** - the risk tier is computed by `deriveTier()` from an illustrative reference-range table; a disagreement with the model is surfaced, never enacted | flagged (soft) |
| **prose coverage** - numbers and metric names in the rationale are backed by provenance | flagged (soft) |

Deltas have no tier, trend or prose, so every check is hard (grounded or rejected):
referential integrity, value tie-out, and **displayed-value backing** - the
`previousValue -> currentValue` the card shows must each equal a provenance ref
value.

**Rejected findings and deltas never render as clinical content** - they go to a
visible "Caught by reconciler" tray with the failed check. That tray is the
point: the safety layer is visible, not asserted.

Two layers, kept distinct: **Zod validates shape** (well-formed JSON, retry if
not); **`reconcile()` validates truth** (claims tie to the record). The displayed
risk tier is always the record-derived tier, never the model's.

`CLAUDE.md` has the full five-point constitution.

### Reconciler eval

`npm run eval` runs an adversarial harness against `reconcile()` and
`reconcileDelta()`: a clean set that should pass, and one poisoned item per
failure mode (fabricated number, flipped trend, hallucinated metric,
over-escalated tier, unbacked prose number, unbacked metric name, and a delta
with a fabricated `currentValue`). It reports:

```
catch rate            100%  (7/7 adversarial caught)
false-rejection rate  0%    (0/6 clean rejected)
```

## The three screens

| Screen | What it does |
| --- | --- |
| **Member Board** (`/`) | The clinician's day: each member as a card with a one-line AI readiness headline and a flag count. |
| **Pre-Brief** (`/members/[id]`) | What changed since last visit (reconciled deltas); risk-ranked findings, each reconciled, with a provenance disclosure and accept / edit / dismiss controls; the "Caught by reconciler" tray (rejected findings and changes); talking points and a draft plan; the sign-off gate. |
| **Debrief** (`/members/[id]/debrief`) | A member-facing draft in a calm, plain-language voice. The clinician edits inline; the diff between the AI draft and the sent version is shown as the flywheel teaching signal. An audit trail panel lists every event. |

## How the AI is wired in

The pre-brief and debrief are generated live by the Anthropic API inside the
backend (`lib/ai/prebrief.ts`, `lib/ai/debrief.ts`), not by any client code. Each
finding's factual claim is emitted in a structured shape (`level` | `trend` |
`observation`) so it can be checked. The response is:

1. **shape-validated** with Zod (`PreBriefDraftSchema`); invalid JSON is retried
   once with the error fed back, then surfaced as a clean error;
2. **reconciled** - `reconcile()` / `reconcileDelta()` run over every finding and
   delta (see the thesis above);
3. for `observation` claims only, additionally reviewed by an **advisory LLM
   judge** (`lib/ai/judge.ts`) that can flag, never accept.

**Unvalidated or unreconciled model output is never displayed as clinical
content.** `ANTHROPIC_API_KEY` is read server-side only, in the route handlers and
`lib/ai/`.

## Scope & honesty

Deliberately **out of scope**, and it would be a mistake to read the absence as
unfinished:

- **Auth**: no sign-in; a single implied clinician.
- **Persistence**: clinician actions, edits and the audit log live in the
  TanStack Query cache for the session. Reload resets them.
- **Real PHI**: synthetic fixtures only, by design.
- **Multi-clinician concurrency**: no locking, no real-time.
- **Full mobile**: the layout degrades gracefully to narrow widths but is not a
  designed mobile experience.

The prototype is a vertical slice of the visit software flow, not a system.

## Running it

```bash
npm install
cp .env.example .env.local     # optional: add ANTHROPIC_API_KEY (server-side only)
npm run dev                    # http://localhost:3000
```

**Without an API key** the app is fully navigable: the pre-brief endpoint returns
a built-in sample (still run through the reconciler - the sample deliberately
includes a finding *and* a delta that fail, so the tray is populated) and the
debrief endpoint returns a template. Both are labelled "sample" in the UI. **With
a key** both are generated live by `claude-opus-5` (override with
`ANTHROPIC_MODEL`). If the key is identity-linked, also set
`ANTHROPIC_WORKSPACE_ID`.

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint` ·
`npm run typecheck` · `npm run eval`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 ·
TanStack Query · Zod · `@anthropic-ai/sdk` (server-side only). Deploy target: Vercel.

```
app/
  page.tsx                     Member Board
  members/[memberId]/          Pre-Brief screen
  members/[memberId]/debrief/  Debrief screen
  api/prebrief/ api/debrief/   Route handlers (Anthropic calls, Zod validation)
components/
  member-board/ prebrief/ debrief/ audit/ ui/
lib/
  schemas.ts                   Zod schemas: the source of truth for the data model and AI I/O
  types.ts                     types, all inferred from the schemas
  reconcile.ts                 the deterministic reconciler (pure, synchronous)
  reference-ranges.ts          illustrative bands + deriveTier()
  ai/                          the AI boundary, SERVER ONLY (prebrief, debrief, judge, client)
  fixtures/                    three synthetic members + sample pre-briefs
  diff.ts                      word-level diff for the flywheel signal
  audit-cache.ts               the append-only audit log
evals/                         adversarial eval for the reconciler (npm run eval)
```

## Deploy (Vercel)

```bash
npm i -g vercel
vercel                                   # link + first deploy
vercel env add ANTHROPIC_API_KEY production   # paste the key; server-side by default
vercel --prod
```

The key is only referenced in `app/api/*/route.ts` (Node runtime), so it never
reaches the client bundle. With no key set the deployment still runs, on the
sample/template fallbacks.

## Walkthrough (60-90s)

1. **Member Board.** Three members, each with a periwinkle AI readiness line.
   "The model reads the whole longitudinal record and drafts. Nothing here is
   decided, and not everything it drafted made it onto the screen."
2. **Open Marcus B.** (first visit, invisible risk). Expand a finding's
   provenance: every claim points to the exact measurement, and it ties out.
3. **Scroll to "Caught by reconciler."** A finding the model produced whose cited
   value does not match the record. The deterministic layer rejected it before it
   could render as clinical content. "This is the part you can't get from a
   candidate who uses Claude to write code."
4. **A "review carefully" finding.** The model proposed a higher tier than the
   reference ranges support; the reconciler shows both and lets the clinician
   decide.
5. **Dismiss one, edit another, sign off.** The edited finding resolves from
   periwinkle to confirmed ink; the gate only opens once every finding is resolved.
6. **Debrief.** The signed-off pre-brief is redrafted in plain, on-your-side
   language. Edit a line, and the **flywheel diff** shows the change word by word.
7. **Audit trail.** System suggestions, reconciler verdicts, and clinician
   actions, with actor and time.

One sentence: *the model drafts, a deterministic layer rejects anything it can't
ground, the clinician decides.*
