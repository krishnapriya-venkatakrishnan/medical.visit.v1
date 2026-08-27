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
  types/      shared domain types
  schemas/    Zod schemas - the source of truth for all AI input/output
  ai/         the AI boundary - SERVER ONLY (import "server-only")
  fixtures/   synthetic data
```

## Out of scope (on purpose)

Authentication, real persistence, real PHI, multi-clinician concurrency, and full
mobile support are intentionally **not** implemented. This is a focused prototype
of the visit software flow, not a production system.
