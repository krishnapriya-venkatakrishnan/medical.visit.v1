# brief

A working prototype of the software behind a preventive-health visit:

> AI-generated **pre-brief** before the member arrives, a **clinician-in-the-loop**
> review where the clinician is always the decision-maker, and a drafted member
> **debrief** afterwards.

Built the way a regulated-systems engineer would build clinical AI.

> **This is a prototype, not a medical device.** It runs on synthetic data only.
> No real personal or health data. Names are obviously fake. A disclaimer to that
> effect is fixed to every screen.

## Thesis: provenance-gated, clinician-in-the-loop clinical AI

The AI does the heavy lifting; the clinician stays the decision-maker; every claim
is auditable. Three principles are enforced in the UI, not just claimed here:

1. **Every AI claim carries provenance.** Each finding and each change references
   the exact measurement(s) it derives from (`source` path, value, scan date).
   The schema rejects any finding or delta with no source, so an unsourced claim
   cannot reach the screen.
2. **The clinician is the decision-maker.** AI output is *provisional* and renders
   in periwinkle until a clinician accepts, edits, or dismisses it, at which point
   it resolves to confirmed ink. The pre-brief cannot be signed off until every
   finding is resolved, and nothing is drafted for the member until it is.
3. **Full audit trail.** Every system suggestion and every clinician action is
   logged with actor and timestamp, shown on the debrief screen.

`CLAUDE.md` has the full five-point constitution.

## The three screens

| Screen | What it does |
| --- | --- |
| **Member Board** (`/`) | The clinician's day: each member as a card with a one-line AI readiness headline and a flag count. |
| **Pre-Brief** (`/members/[id]`) | What changed since last visit (signed deltas), risk-ranked findings each with a provenance disclosure and accept / edit / dismiss controls, talking points and a draft plan, and the sign-off gate. |
| **Debrief** (`/members/[id]/debrief`) | A member-facing draft in a calm, plain-language voice. The clinician edits inline; the diff between the AI draft and the sent version is shown as the flywheel teaching signal. An audit trail panel lists every event. |

## How the AI is wired in

The pre-brief and debrief are generated live by the Anthropic API inside the
backend (`lib/ai/prebrief.ts`, `lib/ai/debrief.ts`), not by any client code. The
model is prompted to return JSON only; the response is parsed and validated with
Zod (`PreBriefDraftSchema`, `DebriefDraftSchema`) before anything renders. Invalid
output is retried once with the validation error fed back, then surfaced as a
clean error. **Unvalidated model output is never displayed.** That validation
step is the point: regulated-grade handling of a non-deterministic component.

`ANTHROPIC_API_KEY` is read server-side only, in the route handlers.

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
a built-in sample and the debrief endpoint returns a template assembled from the
finalised pre-brief. Both are labelled "sample" in the UI. **With a key** both are
generated live by `claude-opus-5`.

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint` ·
`npm run typecheck`.

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
  ai/                          the AI boundary, SERVER ONLY (import "server-only")
  fixtures/                    three synthetic members + sample pre-briefs
  diff.ts                      word-level diff for the flywheel signal
  audit-cache.ts               the append-only audit log
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
   "The AI reads the whole longitudinal record and drafts, but nothing here is
   decided yet."
2. **Open Marcus B.** (first visit, invisible risk). Pre-brief: no deltas yet,
   four findings ranked by risk.
3. **Expand a finding's provenance.** "Every claim points back to the exact
   measurements. Visceral fat index 14, on this scan. No source, no claim."
4. **Dismiss one finding, edit another.** The edited finding resolves from
   periwinkle to confirmed ink with the clinician's wording.
5. **Sign off.** The gate only opens once every finding is resolved.
6. **Debrief.** The signed-off pre-brief is redrafted in plain, on-your-side
   language. Edit a line in the summary.
7. **Flywheel teaching signal.** The diff between the AI draft and the clinician's
   version, highlighted word by word. "This is what the model would learn from."
8. **Audit trail.** Every system suggestion and clinician action, with actor and
   time.

One sentence: *the AI drafts, the clinician decides, everything is auditable.*
