/**
 * Zod schemas - the single source of truth for the data model (spec section 4)
 * and, critically, for everything that crosses the AI boundary.
 *
 * Two layers, kept distinct (non-negotiable #4):
 *  - SHAPE: these schemas validate that model output is well-formed JSON. Zod
 *    checks the JSON is *valid*.
 *  - TRUTH: `lib/reconcile.ts` checks each claim against the record. It checks
 *    the JSON is *true*. Zod does not do this and must not be confused for it.
 *
 * The `claim` field on a Finding is structured (level | trend | observation) so
 * the reconciler can tie it out. `proposedTier` is the model's suggestion only;
 * the displayed tier is `deriveTier()`-computed (non-negotiable #2).
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

/** A dotted path into a Scan, e.g. "blood.ldl" or "skin.flagged[0].diameterMm". */
export const MetricPathSchema = z.string().min(1);

/**
 * A pointer from an AI claim back to the exact measurement that produced it.
 * `metric` is the path; `value` and `scanDate` are what the model says is there.
 * The reconciler checks that against the record (spec section 4.5).
 */
export const ProvenanceRefSchema = z.object({
  metric: MetricPathSchema,
  value: z.union([z.string(), z.number()]),
  scanDate: IsoDateSchema,
});

/** Risk tiers, muted not ER-loud (spec section 7). Computed by code, never the model. */
export const RiskTierSchema = z.enum(["good", "watch", "elevated", "priority"]);

/** Clinician-in-the-loop lifecycle. Starts `unverified` (renders periwinkle). */
export const FindingStatusSchema = z.enum([
  "unverified",
  "accepted",
  "edited",
  "dismissed",
]);

/**
 * The model's factual claim, in one of three machine-checkable shapes. This is
 * what makes reconciliation possible: prose can only be read, structure can be
 * tied out against the record.
 */
export const ClaimSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("level"),
    metric: MetricPathSchema,
    value: z.number(),
    scanDate: IsoDateSchema,
  }),
  z.object({
    kind: z.literal("trend"),
    metric: MetricPathSchema,
    from: z.number(),
    fromDate: IsoDateSchema,
    to: z.number(),
    toDate: IsoDateSchema,
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    kind: z.literal("observation"),
    metric: MetricPathSchema,
    scanDate: IsoDateSchema,
    note: z.string(),
  }),
]);

export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Model prose. Never authoritative; the `claim` is what gets reconciled. */
  rationale: z.string(),
  claim: ClaimSchema,
  /** What the model wants the tier to be. NOT what we display; see the reconciler. */
  proposedTier: RiskTierSchema,
  provenance: z.array(ProvenanceRefSchema).min(1, "every finding needs provenance"),
  status: FindingStatusSchema.default("unverified"),
  clinicianEdit: z.string().optional(),
});

// ===========================================================================
// Reconciliation - produced by the deterministic reconciler (spec section 4.5).
// This is the audit artifact: what code checked, and what it concluded.
// ===========================================================================

export const ReconCheckSchema = z.object({
  name: z.string(),
  severity: z.enum(["hard", "soft"]),
  passed: z.boolean(),
  detail: z.string(),
});

export const ReconciliationSchema = z.object({
  findingId: z.string(),
  /** rejected = a hard check failed, never renders as clinical content.
   *  flagged  = grounded but a soft check failed or the tier was disputed.
   *  grounded = every check passed. */
  verdict: z.enum(["grounded", "flagged", "rejected"]),
  /** Computed from the record via deriveTier(). Authoritative - overrides proposedTier. */
  derivedTier: RiskTierSchema,
  checks: z.array(ReconCheckSchema),
});

/**
 * Reconciliation for a delta. Deltas have no tier, trend or prose to check, so
 * every check is hard: a delta is either grounded or rejected (spec section 4.5).
 */
export const DeltaReconciliationSchema = z.object({
  deltaId: z.string(),
  verdict: z.enum(["grounded", "rejected"]),
  checks: z.array(ReconCheckSchema),
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
 * The shape the model is asked to return: no clinician-only fields (`status`,
 * `clinicianEdit`). The model provides `claim`, `proposedTier` and `provenance`;
 * the server runs the reconciler over each finding before anything renders.
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
  /** Human-readable summary. The structured fields below drive the Activity table. */
  action: z.string(),
  targetId: z.string(),
  /** The finding this event concerns, by title; "Pre-brief" for whole-brief events. */
  finding: z.string().optional(),
  /** Reconciler verdict, on reconciler events. */
  verdict: z.enum(["grounded", "flagged", "rejected"]).optional(),
  /** What the actor did: Generated, Accepted, Edited, Dismissed, Reopened, Signed off, ... */
  outcome: z.string().optional(),
});
