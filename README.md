# brief

A working prototype of the software behind a preventive-health visit:

> AI-generated pre-brief → clinician-in-the-loop review → drafted member debrief

Built the way a regulated-systems engineer would build clinical AI. See
[`CLAUDE.md`](./CLAUDE.md) for the project constitution and the five
non-negotiables that define the product.

> **This is a prototype, not a medical device.** It runs on synthetic data only.
> No real personal or health data. Names are obviously fake.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Tailwind v4 · TanStack Query ·
Zod · Anthropic API (server-side only). Deploy target: Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY (server-side only)
npm run dev
```

Open http://localhost:3000.

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint` ·
`npm run typecheck`.

## Project structure

```
app/          routes, root layout, client providers
components/    UI components
lib/
  types.ts    shared domain types (inferred from the schemas)
  schemas.ts  Zod schemas - the source of truth for the data model and AI I/O
  ai/         the AI boundary - SERVER ONLY (import "server-only")
  fixtures/   three synthetic member records (JSON) + a validating loader
```

## Data model

`lib/schemas.ts` defines the longitudinal member record (`Member` -> `Scan` ->
skin / heart / blood / body / wearables) and the AI-produced `PreBrief`
(`Delta`s, risk-ranked `Finding`s, talking points, draft action plan). Findings
and deltas each require a non-empty `provenance` array pointing back to the exact
measurement that produced them. Types are derived from the schemas with
`z.infer`.

Fixtures (`lib/fixtures/`) are parsed against `MemberSchema` at load, so a
malformed record fails the build. Three members: **Elin A.** (returning; a
tracked mole grew and LDL is creeping), **Marcus B.** (first visit; high visceral
fat and borderline BP), **Priya C.** (returning; broad improvement over a year).

## Out of scope (on purpose)

Authentication, real persistence, real PHI, multi-clinician concurrency, and full
mobile support are intentionally **not** implemented. This is a focused prototype
of the visit software flow, not a production system.
