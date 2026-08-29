/**
 * ============================================================================
 * THE DETERMINISTIC RECONCILER (spec section 4.5)
 * ============================================================================
 *
 * This is the module that separates this build from an API wrapper. The model
 * chooses which findings and deltas to surface and writes the rationale prose. It
 * does NOT decide whether a number is real, which way a trend goes, or how risky
 * something is - those are computed here, from the record.
 *
 *   reconcile(finding, member)      -> Reconciliation
 *   reconcileDelta(delta, member)   -> DeltaReconciliation
 *
 * Pure and synchronous: no network, no imports beyond the reference-range table,
 * so the eval harness (`evals/`) can hammer it. The one non-deterministic piece,
 * the advisory LLM judge for `observation` claims, is applied separately by the
 * route, never here.
 *
 * FINDINGS - check pipeline, hard checks first:
 *   1. referential-integrity (hard -> rejected) - every cited metric path and
 *      scanDate exists in the record.
 *   2. value-tie-out         (hard -> rejected) - every cited value exactly
 *      equals the record value at that path + date.
 *   3. trend-consistency     (hard -> rejected) - a trend claim's stated
 *      direction matches sign(to - from) recomputed from the record.
 *   4. tier-derivation       (soft -> flagged) - the tier is computed by
 *      deriveTier(); a mismatch with the model's proposedTier is surfaced for
 *      the clinician, never enacted.
 *   5. prose-coverage        (soft -> flagged) - numbers AND metric names in the
 *      rationale prose are backed by the provenance set.
 *
 * DELTAS - no tier / trend / prose, so every check is hard (grounded or rejected):
 *   1. referential-integrity - every provenance ref's metric path + scanDate exist.
 *   2. value-tie-out         - every provenance ref value exactly equals the record.
 *   3. displayed-value-backing - the shown currentValue equals some provenance ref
 *      value, and (unless direction is "unchanged") previousValue equals another.
 *
 * verdict: rejected if any hard check fails; for findings, flagged if only a soft
 * check does; else grounded.
 */

import type {
  Delta,
  DeltaReconciliation,
  Finding,
  Member,
  ProvenanceRef,
  Reconciliation,
  ReconCheck,
  RiskTier,
  Scan,
} from "@/lib/types";
import { deriveTier } from "@/lib/reference-ranges";

/** Finding checks whose failure rejects (vs the soft checks that only flag). */
const REJECTING_CHECKS = new Set(["referential-integrity", "value-tie-out", "trend-consistency"]);

/**
 * Two numbers count as "the same value" within this tolerance. Clinical values
 * carry at most two decimals, so 1e-6 is far below any meaningful increment yet
 * still absorbs floating-point representation noise from a faithful copy. Every
 * real fabrication in the eval and the samples differs by >= 0.4.
 */
const FLOAT_EPSILON = 1e-6;

// ---------------------------------------------------------------------------
// Record access
// ---------------------------------------------------------------------------

function scanByDate(member: Member, date: string): Scan | undefined {
  return member.scans.find((s) => s.date === date);
}

/** Read a dotted path (with optional `[n]` indexes) out of a scan. */
function readPath(scan: Scan, path: string): unknown {
  let node: unknown = scan;
  for (const rawKey of path.split(".")) {
    const match = rawKey.match(/^([A-Za-z0-9_]+)(?:\[(\d+)\])?$/);
    if (!match || node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[match[1]];
    if (match[2] !== undefined) {
      if (!Array.isArray(node)) return undefined;
      node = node[Number(match[2])];
    }
  }
  return node;
}

function readMetric(member: Member, metric: string, scanDate: string): number | string | undefined {
  const scan = scanByDate(member, scanDate);
  if (!scan) return undefined;
  const value = readPath(scan, metric);
  return typeof value === "number" || typeof value === "string" ? value : undefined;
}

function valuesEqual(a: number | string, b: number | string): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < FLOAT_EPSILON;
  return String(a) === String(b);
}

/** Strip the array index so a metric path can be looked up in keyword/range tables. */
function stripIndex(metric: string): string {
  return metric.replace(/\[\d+\]/g, "");
}

// ---------------------------------------------------------------------------
// Check builders
// ---------------------------------------------------------------------------

function pass(name: string, severity: ReconCheck["severity"], detail: string): ReconCheck {
  return { name, severity, passed: true, detail };
}
function fail(name: string, severity: ReconCheck["severity"], detail: string): ReconCheck {
  return { name, severity, passed: false, detail };
}

/**
 * Referential integrity over an arbitrary set of (metric, scanDate) refs. Returns
 * the failing ReconCheck, or null when every ref resolves. Shared by findings and
 * deltas so there is one implementation of "does the record contain this".
 */
function refsResolve(
  refs: ReadonlyArray<{ metric: string; scanDate: string }>,
  member: Member,
): ReconCheck | null {
  for (const ref of refs) {
    if (!scanByDate(member, ref.scanDate)) {
      return fail("referential-integrity", "hard", `no scan dated ${ref.scanDate} in the record`);
    }
    if (readMetric(member, ref.metric, ref.scanDate) === undefined) {
      return fail(
        "referential-integrity",
        "hard",
        `metric path "${ref.metric}" is not present in the ${ref.scanDate} scan`,
      );
    }
  }
  return null;
}

/**
 * Value tie-out over an arbitrary ProvenanceRef[]: each cited value must exactly
 * equal the record. Returns the failing ReconCheck, or null when all tie out.
 */
function refsTieOut(refs: ReadonlyArray<ProvenanceRef>, member: Member): ReconCheck | null {
  for (const ref of refs) {
    const actual = readMetric(member, ref.metric, ref.scanDate);
    if (actual === undefined || !valuesEqual(actual, ref.value)) {
      return fail(
        "value-tie-out",
        "hard",
        `provenance says ${ref.metric} = ${ref.value} on ${ref.scanDate}; record has ${actual ?? "nothing"}`,
      );
    }
  }
  return null;
}

const RESOLVED_OK = pass(
  "referential-integrity",
  "hard",
  "every cited metric path and date exists in the record",
);
const TIE_OUT_OK = pass("value-tie-out", "hard", "every cited value ties out to the record exactly");

// ---------------------------------------------------------------------------
// Finding checks
// ---------------------------------------------------------------------------

/** Every provenance ref, and the claim's own metric/date(s), resolve in the record. */
function checkReferentialIntegrity(finding: Finding, member: Member): ReconCheck {
  const refs: Array<{ metric: string; scanDate: string }> = finding.provenance.map((p) => ({
    metric: p.metric,
    scanDate: p.scanDate,
  }));
  const c = finding.claim;
  if (c.kind === "level" || c.kind === "observation") {
    refs.push({ metric: c.metric, scanDate: c.scanDate });
  } else {
    refs.push({ metric: c.metric, scanDate: c.fromDate }, { metric: c.metric, scanDate: c.toDate });
  }
  return refsResolve(refs, member) ?? RESOLVED_OK;
}

/** Every cited value exactly matches the record. This is the reconciliation break. */
function checkValueTieOut(finding: Finding, member: Member): ReconCheck {
  const provFail = refsTieOut(finding.provenance, member);
  if (provFail) return provFail;

  const c = finding.claim;
  if (c.kind === "level") {
    const actual = readMetric(member, c.metric, c.scanDate);
    if (actual === undefined || !valuesEqual(actual, c.value)) {
      return fail(
        "value-tie-out",
        "hard",
        `claim says ${c.metric} = ${c.value} on ${c.scanDate}; record has ${actual ?? "nothing"}`,
      );
    }
  } else if (c.kind === "trend") {
    const from = readMetric(member, c.metric, c.fromDate);
    const to = readMetric(member, c.metric, c.toDate);
    if (from === undefined || !valuesEqual(from, c.from)) {
      return fail(
        "value-tie-out",
        "hard",
        `claim says ${c.metric} was ${c.from} on ${c.fromDate}; record has ${from ?? "nothing"}`,
      );
    }
    if (to === undefined || !valuesEqual(to, c.to)) {
      return fail(
        "value-tie-out",
        "hard",
        `claim says ${c.metric} is ${c.to} on ${c.toDate}; record has ${to ?? "nothing"}`,
      );
    }
  }
  return TIE_OUT_OK;
}

/** A trend claim's direction matches sign(to - from) recomputed from the record. */
function checkTrendConsistency(finding: Finding, member: Member): ReconCheck {
  const c = finding.claim;
  if (c.kind !== "trend") {
    return pass("trend-consistency", "hard", "not a trend claim");
  }
  const from = readMetric(member, c.metric, c.fromDate);
  const to = readMetric(member, c.metric, c.toDate);
  if (typeof from !== "number" || typeof to !== "number") {
    return fail("trend-consistency", "hard", "trend endpoints are not both numeric in the record");
  }
  const recomputed = to > from ? "up" : to < from ? "down" : "flat";
  if (recomputed !== c.direction) {
    return fail(
      "trend-consistency",
      "hard",
      `claim says "${c.direction}" but the record goes ${from} -> ${to} (${recomputed})`,
    );
  }
  return pass("trend-consistency", "hard", `record confirms a ${c.direction} trend (${from} -> ${to})`);
}

/**
 * Tier is computed from the record, never taken from the model. This is a SOFT
 * check throughout: a mismatch is surfaced for the clinician (verdict "flagged"),
 * it never rejects. Severity and verdict stay aligned.
 */
function checkTierDerivation(finding: Finding): { check: ReconCheck; derivedTier: RiskTier } {
  const c = finding.claim;
  if (c.kind === "observation") {
    return {
      check: pass(
        "tier-derivation",
        "soft",
        "observational claim; tier is not numerically derivable, model proposal retained pending the advisory judge",
      ),
      derivedTier: finding.proposedTier,
    };
  }

  const value = c.kind === "level" ? c.value : c.to;
  const derived = deriveTier(c.metric, value);

  if (derived === null) {
    return {
      check: fail(
        "tier-derivation",
        "soft",
        `no reference range for "${c.metric}"; tier not independently derived`,
      ),
      derivedTier: finding.proposedTier,
    };
  }
  if (derived !== finding.proposedTier) {
    return {
      check: fail(
        "tier-derivation",
        "soft",
        `model proposed "${finding.proposedTier}"; reference-range tier for ${c.metric} = ${value} is "${derived}"`,
      ),
      derivedTier: derived,
    };
  }
  return {
    check: pass(
      "tier-derivation",
      "soft",
      `reference-range tier "${derived}" matches the model's proposal`,
    ),
    derivedTier: derived,
  };
}

/**
 * Metric name -> keyword(s). A keyword is "covered" when a provenance ref's
 * metric maps to it. Any keyword that appears in the rationale but is not covered
 * is an unbacked metric mention. Conservative and case-insensitive; substring
 * match, so plurals ("moles", "triglycerides") are caught.
 */
const METRIC_KEYWORDS: Record<string, string[]> = {
  "blood.ldl": ["ldl"],
  "blood.hba1c": ["hba1c"],
  "blood.crp": ["crp"],
  "blood.triglycerides": ["triglyceride"],
  "blood.fastingGlucose": ["glucose"],
  "heart.bpSystolic": ["systolic", "blood pressure"],
  "heart.bpDiastolic": ["diastolic"],
  "heart.restingHr": ["resting heart"],
  "heart.arterialStiffness": ["arterial stiffness"],
  "body.visceralFatIndex": ["visceral fat"],
  "body.bodyFatPct": ["body fat"],
  "body.gripStrengthKg": ["grip strength"],
  "skin.flagged.diameterMm": ["mole", "lesion"],
  "skin.flagged.changeMm": ["mole", "lesion"],
};
const ALL_METRIC_KEYWORDS = [...new Set(Object.values(METRIC_KEYWORDS).flat())];

/**
 * Numbers and metric names in the rationale prose are backed by the provenance
 * set. Lenient: SOFT (flag, never reject).
 */
function checkProseCoverage(finding: Finding, member: Member): ReconCheck {
  // --- backed numbers ---
  const covered = new Set<string>();
  for (const ref of finding.provenance) {
    covered.add(String(ref.value));
    const actual = readMetric(member, ref.metric, ref.scanDate);
    if (actual !== undefined) covered.add(String(actual));
  }
  const c = finding.claim;
  if (c.kind === "level") covered.add(String(c.value));
  if (c.kind === "trend") {
    covered.add(String(c.from));
    covered.add(String(c.to));
  }
  const coveredNums = [...covered].map(Number).filter((n) => !Number.isNaN(n));

  const tokens = finding.rationale.match(/\d+(?:\.\d+)?/g) ?? [];
  const uncoveredNums = [
    ...new Set(
      tokens.filter((tok) => {
        if (/^(19|20)\d\d$/.test(tok)) return false; // years
        if (tok.length === 1) return false; // ordinals, "1-3 sentences" etc.
        const n = Number(tok);
        if (covered.has(tok)) return false;
        return !coveredNums.some((cn) => Math.abs(cn - n) < 0.05);
      }),
    ),
  ];

  // --- backed metric names ---
  const coveredKeywords = new Set<string>();
  for (const ref of finding.provenance) {
    for (const kw of METRIC_KEYWORDS[stripIndex(ref.metric)] ?? []) coveredKeywords.add(kw);
  }
  const lowerRationale = finding.rationale.toLowerCase();
  const uncoveredKeywords = ALL_METRIC_KEYWORDS.filter(
    (kw) => lowerRationale.includes(kw) && !coveredKeywords.has(kw),
  );

  const problems: string[] = [];
  if (uncoveredNums.length) problems.push(`numbers ${uncoveredNums.join(", ")}`);
  if (uncoveredKeywords.length) problems.push(`metrics "${uncoveredKeywords.join('", "')}"`);

  if (problems.length) {
    return fail(
      "prose-coverage",
      "soft",
      `rationale mentions ${problems.join("; ")} with no matching provenance`,
    );
  }
  return pass("prose-coverage", "soft", "every number and metric in the rationale is backed by provenance");
}

// ---------------------------------------------------------------------------
// Finding entry point
// ---------------------------------------------------------------------------

export function reconcile(finding: Finding, member: Member): Reconciliation {
  const referential = checkReferentialIntegrity(finding, member);

  // If cited data does not even resolve, later checks would throw noise; stop here.
  if (!referential.passed) {
    return {
      findingId: finding.id,
      verdict: "rejected",
      derivedTier: finding.proposedTier,
      checks: [referential],
    };
  }

  const tieOut = checkValueTieOut(finding, member);
  const trend = checkTrendConsistency(finding, member);
  const { check: tierCheck, derivedTier } = checkTierDerivation(finding);
  const coverage = checkProseCoverage(finding, member);
  const checks = [referential, tieOut, trend, tierCheck, coverage];

  const rejected = checks.some((c) => !c.passed && REJECTING_CHECKS.has(c.name));
  const flagged = !rejected && checks.some((c) => !c.passed);

  return {
    findingId: finding.id,
    verdict: rejected ? "rejected" : flagged ? "flagged" : "grounded",
    derivedTier,
    checks,
  };
}

export interface ReconciledFinding {
  finding: Finding;
  reconciliation: Reconciliation;
}

/** Reconcile a batch of findings and split it: clinical content vs the "caught" tray. */
export function reconcileFindings(
  findings: Finding[],
  member: Member,
): { clinical: ReconciledFinding[]; rejected: ReconciledFinding[] } {
  const clinical: ReconciledFinding[] = [];
  const rejected: ReconciledFinding[] = [];
  for (const finding of findings) {
    const reconciliation = reconcile(finding, member);
    (reconciliation.verdict === "rejected" ? rejected : clinical).push({ finding, reconciliation });
  }
  return { clinical, rejected };
}

// ---------------------------------------------------------------------------
// Delta checks + entry point
// ---------------------------------------------------------------------------

/**
 * The values the delta actually displays must each be backed by a provenance ref:
 * currentValue always, and previousValue by a *separate* ref whenever it differs
 * from currentValue (regardless of the stated direction). When previousValue and
 * currentValue are equal, one ref backs both. Prevents a delta from rendering
 * previous -> current with a fabricated endpoint even when the provenance itself
 * ties out.
 */
function checkDisplayedValueBacking(delta: Delta): ReconCheck {
  const provValues = delta.provenance.map((p) => p.value);

  const currentIdx = provValues.findIndex((v) => valuesEqual(v, delta.currentValue));
  if (currentIdx === -1) {
    return fail(
      "displayed-value-backing",
      "hard",
      `currentValue ${delta.currentValue} is not backed by any provenance entry`,
    );
  }

  if (!valuesEqual(delta.previousValue, delta.currentValue)) {
    const prevBacked = provValues.some((v, i) => i !== currentIdx && valuesEqual(v, delta.previousValue));
    if (!prevBacked) {
      return fail(
        "displayed-value-backing",
        "hard",
        `previousValue ${delta.previousValue} is not backed by a separate provenance entry`,
      );
    }
  }
  return pass("displayed-value-backing", "hard", "the displayed values are backed by provenance");
}

export function reconcileDelta(delta: Delta, member: Member): DeltaReconciliation {
  const referential = refsResolve(delta.provenance, member) ?? RESOLVED_OK;
  if (!referential.passed) {
    return { deltaId: delta.id, verdict: "rejected", checks: [referential] };
  }

  const tieOut = refsTieOut(delta.provenance, member) ?? TIE_OUT_OK;
  const backing = checkDisplayedValueBacking(delta);
  const checks = [referential, tieOut, backing];

  // Deltas have no soft checks: any failure rejects.
  const rejected = checks.some((c) => !c.passed);
  return { deltaId: delta.id, verdict: rejected ? "rejected" : "grounded", checks };
}

export interface ReconciledDelta {
  delta: Delta;
  reconciliation: DeltaReconciliation;
}

/** Reconcile a batch of deltas and split it, mirroring `reconcileFindings`. */
export function reconcileDeltas(
  deltas: Delta[],
  member: Member,
): { grounded: ReconciledDelta[]; rejected: ReconciledDelta[] } {
  const grounded: ReconciledDelta[] = [];
  const rejected: ReconciledDelta[] = [];
  for (const delta of deltas) {
    const reconciliation = reconcileDelta(delta, member);
    (reconciliation.verdict === "rejected" ? rejected : grounded).push({ delta, reconciliation });
  }
  return { grounded, rejected };
}
