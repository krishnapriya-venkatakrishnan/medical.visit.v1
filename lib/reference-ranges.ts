/**
 * Illustrative reference ranges - PROTOTYPE ONLY, not clinical guidance.
 *
 * The point of this table is architectural: risk tier is computed here, from the
 * record, not taken from the model (spec section 4.5, check #4). The exact
 * cut-offs are stand-ins; a real system would use validated, versioned ranges.
 *
 * A band lists the value at which each tier begins:
 *   kind "high-bad": value < watch  -> good
 *                    watch <= value < elevated -> watch
 *                    elevated <= value < priority -> elevated
 *                    value >= priority -> priority
 *   kind "low-bad" is the mirror image (a low value is the concern).
 */

import type { MetricPath, RiskTier } from "@/lib/types";

type Band =
  | { kind: "high-bad"; watch: number; elevated: number; priority: number }
  | { kind: "low-bad"; watch: number; elevated: number; priority: number };

export const REFERENCE_RANGES: Record<string, Band> = {
  "blood.ldl": { kind: "high-bad", watch: 3.0, elevated: 4.0, priority: 5.0 },
  "blood.hdl": { kind: "low-bad", watch: 1.3, elevated: 1.0, priority: 0.8 },
  "blood.triglycerides": { kind: "high-bad", watch: 1.7, elevated: 2.3, priority: 5.6 },
  "blood.hba1c": { kind: "high-bad", watch: 39, elevated: 48, priority: 58 },
  "blood.fastingGlucose": { kind: "high-bad", watch: 5.6, elevated: 7.0, priority: 11.1 },
  "blood.crp": { kind: "high-bad", watch: 3, elevated: 10, priority: 30 },
  "heart.restingHr": { kind: "high-bad", watch: 80, elevated: 100, priority: 120 },
  "heart.bpSystolic": { kind: "high-bad", watch: 130, elevated: 140, priority: 180 },
  "heart.bpDiastolic": { kind: "high-bad", watch: 85, elevated: 90, priority: 120 },
  "heart.arterialStiffness": { kind: "high-bad", watch: 8, elevated: 10, priority: 13 },
  "body.visceralFatIndex": { kind: "high-bad", watch: 10, elevated: 14, priority: 18 },
  "body.bodyFatPct": { kind: "high-bad", watch: 30, elevated: 35, priority: 40 },
  "body.gripStrengthKg": { kind: "low-bad", watch: 30, elevated: 25, priority: 18 },
};

/**
 * Metric paths carry an optional array index (`skin.flagged[0].changeMm`).
 * Ranges are keyed by the index-free shape.
 */
function normaliseMetric(metric: MetricPath): string {
  return metric.replace(/\[\d+\]/g, "");
}

// Skin-lesion metrics are keyed after the index is stripped.
const SKIN_BANDS: Record<string, Band> = {
  "skin.flagged.diameterMm": { kind: "high-bad", watch: 6, elevated: 10, priority: 14 },
  "skin.flagged.changeMm": { kind: "high-bad", watch: 0.3, elevated: 1.0, priority: 3.0 },
};

function bandFor(metric: MetricPath): Band | undefined {
  const key = normaliseMetric(metric);
  return REFERENCE_RANGES[key] ?? SKIN_BANDS[key];
}

/** True when this metric has a reference range (so a tier can be derived). */
export function hasReferenceRange(metric: MetricPath): boolean {
  return bandFor(metric) !== undefined;
}

/**
 * Compute the risk tier for a value from the record. Returns null when the metric
 * has no reference range - the reconciler treats that as a soft flag, never a
 * silent fall-back to the model's tier.
 */
export function deriveTier(metric: MetricPath, value: number): RiskTier | null {
  const band = bandFor(metric);
  if (!band) return null;

  if (band.kind === "high-bad") {
    if (value >= band.priority) return "priority";
    if (value >= band.elevated) return "elevated";
    if (value >= band.watch) return "watch";
    return "good";
  }
  // low-bad
  if (value <= band.priority) return "priority";
  if (value <= band.elevated) return "elevated";
  if (value <= band.watch) return "watch";
  return "good";
}
