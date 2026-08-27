@AGENTS.md

# Brief - Clinician Workspace - Project Constitution

## Mission

A working prototype of the software behind a preventive-health visit: AI-generated
pre-brief, then clinician-in-the-loop review where the clinician is always the
decision-maker, then a drafted member debrief. Built the way a regulated-systems
engineer would build clinical AI.

## Non-negotiables (these define the product - never violate)

1. **CLINICIAN IS THE DECISION-MAKER.** All AI output is PROVISIONAL until a
   clinician accepts, edits, or dismisses it. Nothing reaches the member without
   sign-off.
2. **EVERY AI CLAIM HAS PROVENANCE.** A finding must reference the exact data
   point(s) it derives from. A claim with no traceable source is a bug.
3. **SYNTHETIC DATA ONLY.** No real personal or health data, ever. Names are
   obviously fake. A visible disclaimer states this is a prototype, not a medical
   device.
4. **VALIDATE ALL AI OUTPUT.** Model responses are parsed as JSON and validated
   with Zod before rendering. Invalid output is rejected/retried, never displayed.
5. **FULL AUDIT TRAIL.** Every system suggestion and clinician action is logged
   with actor + timestamp.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Tailwind · TanStack Query ·
Zod · Anthropic API (server-side only). Deploy: Vercel.

## Design

Light, warm, clinical-calm palette: "elegant day spa meets futuristic clinic,"
light and muted. Restraint, whitespace, humanist type (Hanken Grotesk). No
dark-dashboard aesthetic. Light theme only.

`--provisional` (periwinkle `#8C8CE6`) is RESERVED for unverified AI state only,
never for decoration or focus rings. Every machine-drafted finding renders in
periwinkle until the clinician accepts or edits it, at which point it resolves to
confirmed ink (`--ink`). The signature colour encodes the clinician-in-the-loop
safety model.

Tokens live in `app/globals.css` as CSS variables, exposed to Tailwind via
`@theme`:

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#F6F4EF` | warm bone, app background |
| `--surface` | `#FFFFFF` | cards, panels (soft low shadow) |
| `--ink` | `#20201D` | primary text; = clinician-confirmed state |
| `--muted` | `#6B6A64` | secondary text, audit lines |
| `--accent` | `#2E7D6B` | restrained sage/teal, used sparingly; focus ring |
| `--provisional` | `#8C8CE6` | periwinkle, unverified AI only |

Risk tiers, muted not ER-loud, each with `-solid` / `-fg` / `-tint`:
`watch` soft amber · `elevated` warm ochre · `priority` restrained clay-red ·
`good` sage green. Large radii (16-20px, `--radius-card` 18px). `tabular-nums`
for every numeric value.

## Conventions

- Strict TypeScript, **no `any`**. Zod schemas (`lib/schemas.ts`) are the source
  of truth for AI I/O; derive types with `z.infer`, never hand-write them.
- `ANTHROPIC_API_KEY` server-side only; never expose to client. `lib/ai` is
  `import "server-only"`.
- Small, well-named modules. The prompt+schema module is heavily commented;
  reviewers will read it closely.
- Every screen has explicit loading / empty / error states.
- Primary button = `--ink` fill / `--bg` text. `--accent` only for links and
  low-emphasis affordances. Periwinkle is never a UI affordance.
- **No em dashes (`—`) or en dashes (`–`)** anywhere: not in UI copy, not in
  code, comments, or docs. Use a comma, a period, or a hyphen with spaces.
- Commit messages carry no `Co-Authored-By` trailer and no tool attribution.

## Folder structure

```
app/            routes, root layout, client providers
components/      presentational + interactive UI
lib/
  types.ts      shared domain types (inferred from schemas)
  schemas.ts    Zod schemas - source of truth for AI I/O
  ai/           the AI boundary, SERVER ONLY (import "server-only")
  fixtures/     synthetic member records (JSON) + loader
```

## Out of scope (on purpose - note in README)

Auth, real persistence, real PHI, multi-clinician concurrency, full mobile.
