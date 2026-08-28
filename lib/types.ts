/**
 * Shared domain types.
 *
 * Per the project constitution: the Zod schemas in `lib/schemas.ts` are the
 * source of truth. Every type here is derived from a schema with `z.infer` -
 * nothing in this file is hand-written to shadow a schema.
 */

import type { z } from "zod";
import type {
  MemberSchema,
  ScanSchema,
  MoleSchema,
  MetricPathSchema,
  ProvenanceRefSchema,
  RiskTierSchema,
  FindingStatusSchema,
  ClaimSchema,
  FindingSchema,
  ReconCheckSchema,
  ReconciliationSchema,
  DeltaReconciliationSchema,
  DeltaSchema,
  PreBriefSchema,
  PreBriefDraftSchema,
  FinalisedPreBriefSchema,
  DebriefSchema,
  DebriefDraftSchema,
  AuditEventSchema,
} from "@/lib/schemas";

// Input data (synthetic longitudinal record).
export type Member = z.infer<typeof MemberSchema>;
export type Scan = z.infer<typeof ScanSchema>;
export type Mole = z.infer<typeof MoleSchema>;

// AI-produced output.
export type MetricPath = z.infer<typeof MetricPathSchema>;
export type ProvenanceRef = z.infer<typeof ProvenanceRefSchema>;
export type RiskTier = z.infer<typeof RiskTierSchema>;
export type FindingStatus = z.infer<typeof FindingStatusSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Delta = z.infer<typeof DeltaSchema>;

// Deterministic reconciler output (spec section 4.5).
export type ReconCheck = z.infer<typeof ReconCheckSchema>;
export type Reconciliation = z.infer<typeof ReconciliationSchema>;
export type DeltaReconciliation = z.infer<typeof DeltaReconciliationSchema>;
export type PreBrief = z.infer<typeof PreBriefSchema>;
export type PreBriefDraft = z.infer<typeof PreBriefDraftSchema>;
export type FinalisedPreBrief = z.infer<typeof FinalisedPreBriefSchema>;

// Member-facing debrief.
export type Debrief = z.infer<typeof DebriefSchema>;
export type DebriefDraft = z.infer<typeof DebriefDraftSchema>;

// Audit trail.
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Actor = AuditEvent["actor"];
