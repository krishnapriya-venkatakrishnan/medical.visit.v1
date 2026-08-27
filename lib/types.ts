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
  ProvenanceRefSchema,
  RiskTierSchema,
  FindingStatusSchema,
  FindingSchema,
  DeltaSchema,
  PreBriefSchema,
  PreBriefDraftSchema,
  AuditEventSchema,
} from "@/lib/schemas";

// Input data (synthetic longitudinal record).
export type Member = z.infer<typeof MemberSchema>;
export type Scan = z.infer<typeof ScanSchema>;
export type Mole = z.infer<typeof MoleSchema>;

// AI-produced output.
export type ProvenanceRef = z.infer<typeof ProvenanceRefSchema>;
export type RiskTier = z.infer<typeof RiskTierSchema>;
export type FindingStatus = z.infer<typeof FindingStatusSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Delta = z.infer<typeof DeltaSchema>;
export type PreBrief = z.infer<typeof PreBriefSchema>;
export type PreBriefDraft = z.infer<typeof PreBriefDraftSchema>;

// Audit trail.
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type Actor = AuditEvent["actor"];
