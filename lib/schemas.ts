/**
 * Zod schemas - the single source of truth for the data model (spec section 4)
 * and, critically, for everything that crosses the AI boundary.
 *
 * Non-negotiables enforced here:
 *  - #4 VALIDATE ALL AI OUTPUT. The PreBrief / Finding / Delta schemas are the
 *    validation contract: model output is parsed as JSON and `.parse`d against
 *    these before anything can render. Invalid output is rejected/retried,
 *    never displayed.
 *  - #2 EVERY AI CLAIM HAS PROVENANCE. Findings and deltas both require a
 *    non-empty `provenance` array. A schema that lets an AI assertion through
 *    with no traceable source is a bug.
 *
 * Types are derived from these schemas with `z.infer` in `lib/types.ts`; do not
 * hand-write them.
 *
 * ---------------------------------------------------------------------------
 * Units (synthetic values follow these, matching a European clinic):
 *   ldl, hdl, triglycerides, fastingGlucose ... mmol/L
 *   hba1c ................................... mmol/mol
 *   crp .................................... mg/L
 *   restingHr ............................. bpm
 *   bpSystolic / bpDiastolic ............. mmHg
 *   arterialStiffness ................... m/s (pulse-wave velocity)
 *   visceralFatIndex ................... unitless index, ~1-20
 *   bodyFatPct ........................ %
 *   gripStrengthKg .................. kg
 *   avgSteps ...................... steps/day
 *   avgSleepHrs ................. hours
 *   hrv ...................... ms (RMSSD)
 *   mole diameter / change . mm
 * ---------------------------------------------------------------------------
 */

import { z } from "zod";

/** ISO calendar date, `YYYY-MM-DD`. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date (YYYY-MM-DD)");

/** ISO datetime, used for audit timestamps. */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

// ===========================================================================
// Longitudinal member record - the input data (gets "richer every scan").
// These are synthetic fixtures; see `lib/fixtures/`.
// ===========================================================================

/** A tracked skin lesion. `changeMm` is signed vs the previous tracked measurement. */
export const MoleSchema = z.object({
  id: z.string(),
  location: z.string(),
  diameterMm: z.number().nonnegative(),
  changeMm: z.number(),
  notes: z.string(),
});

export const ScanSchema = z.object({
  date: IsoDateSchema,
  skin: z.object({
    molesTracked: z.number().int().nonnegative(),
    flagged: z.array(MoleSchema),
  }),
  heart: z.object({
    restingHr: z.number(),
    bpSystolic: z.number(),
    bpDiastolic: z.number(),
    ecgNotes: z.string(),
    arterialStiffness: z.number(),
  }),
  blood: z.object({
    ldl: z.number(),
    hdl: z.number(),
    triglycerides: z.number(),
    hba1c: z.number(),
    crp: z.number(),
    fastingGlucose: z.number(),
  }),
  body: z.object({
    visceralFatIndex: z.number(),
    bodyFatPct: z.number(),
    gripStrengthKg: z.number(),
  }),
  wearables: z
    .object({
      avgSteps: z.number(),
      avgSleepHrs: z.number(),
      hrv: z.number(),
    })
    .optional(),
});

export const MemberSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  firstVisit: z.boolean(),
  /** Ordered oldest -> newest; the last entry is today's scan. */
  scans: z.array(ScanSchema).min(1),
});

// ===========================================================================
// AI-produced output - schema-validated before it can render.
// ===========================================================================

/**
 * A pointer from an AI claim back to the exact measurement that produced it.
 * `source` is a dotted path into a Scan, e.g. "blood.ldl" or
 * "skin.flagged[0].diameterMm".
 */
export const ProvenanceRefSchema = z.object({
  source: z.string(),
  value: z.union([z.string(), z.number()]),
  scanDate: IsoDateSchema,
});

/** Risk tiers for findings (spec section 4). Note: no "good" tier here - a
 * finding is something to surface; positive change is expressed as a Delta. */
export const RiskTierSchema = z.enum(["watch", "elevated", "priority"]);

/** Clinician-in-the-loop lifecycle. Starts `unverified` (renders periwinkle). */
export const FindingStatusSchema = z.enum([
  "unverified",
  "accepted",
  "edited",
  "dismissed",
]);

export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  riskTier: RiskTierSchema,
  provenance: z.array(ProvenanceRefSchema).min(1, "every finding needs provenance"),
  status: FindingStatusSchema.default("unverified"),
  clinicianEdit: z.string().optional(),
});

/** A signed change since the previous scan. `valence` is the "good / bad" sign. */
export const DeltaSchema = z.object({
  id: z.string(),
  metric: z.string(),
  previousValue: z.union([z.string(), z.number()]),
  currentValue: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  direction: z.enum(["up", "down", "unchanged"]),
  valence: z.enum(["improvement", "concern", "neutral"]),
  summary: z.string(),
  provenance: z.array(ProvenanceRefSchema).min(1, "every delta needs provenance"),
});

export const PreBriefSchema = z.object({
  memberId: z.string(),
  /** One-line readiness summary for the clinician. Shown on the Member Board. */
  headline: z.string().min(1),
  deltas: z.array(DeltaSchema),
  findings: z.array(FindingSchema),
  talkingPoints: z.array(z.string()),
  draftActionPlan: z.array(z.string()),
});

/**
 * The shape the model is asked to return in Stage 4: no clinician-only fields
 * (`status`, `clinicianEdit`) - those are applied on our side. Kept alongside
 * the full schema so the AI contract stays explicit.
 */
export const PreBriefDraftSchema = PreBriefSchema.extend({
  findings: z.array(FindingSchema.omit({ status: true, clinicianEdit: true })),
});

/**
 * What the client posts to POST /api/debrief: the pre-brief as the clinician
 * finalised it. Dismissed and still-unverified findings are gone; every finding
 * that remains has been accepted or edited, and its `rationale` holds the text
 * the clinician settled on.
 */
export const FinalisedPreBriefSchema = PreBriefSchema.extend({
  findings: z.array(FindingSchema.extend({ status: z.enum(["accepted", "edited"]) })),
});

// ===========================================================================
// Member-facing debrief - AI-produced, schema-validated like the pre-brief.
// Written in a calm, plain-language, on-your-side voice, second person.
// ===========================================================================

export const DebriefSchema = z.object({
  memberId: z.string(),
  greeting: z.string().min(1),
  summary: z.string().min(1),
  whatsGood: z.array(z.string()),
  whatToWatch: z.array(z.string()),
  actionPlan: z.array(z.string()),
  closing: z.string().min(1),
});

/** The shape the model returns; `memberId` is applied on our side. */
export const DebriefDraftSchema = DebriefSchema.omit({ memberId: true });

// ===========================================================================
// Audit trail (non-negotiable #5).
// ===========================================================================

export const AuditEventSchema = z.object({
  at: IsoDateTimeSchema,
  actor: z.enum(["system", "clinician"]),
  action: z.string(),
  targetId: z.string(),
});
