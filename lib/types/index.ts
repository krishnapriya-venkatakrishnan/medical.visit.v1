/**
 * Shared domain types.
 *
 * NOTE: For anything that crosses the AI boundary (model input or output), the
 * Zod schema in `lib/schemas` is the source of truth - derive the type from the
 * schema with `z.infer`, do not hand-write it here.
 */

/** Risk tiers - muted, escalating. Mirrors the design tokens in globals.css. */
export type RiskTier = "good" | "watch" | "elevated" | "priority";

/** Who performed an action in the audit trail. */
export type Actor = "system" | "clinician";

/**
 * Lifecycle of a machine-drafted finding under the clinician-in-the-loop model.
 * `provisional` renders in periwinkle; every other state renders in confirmed ink.
 */
export type FindingStatus = "provisional" | "accepted" | "edited" | "dismissed";

/** One entry in the full audit trail (non-negotiable #5). */
export interface AuditEntry {
  actor: Actor;
  action: string;
  timestamp: string; // ISO 8601
}
