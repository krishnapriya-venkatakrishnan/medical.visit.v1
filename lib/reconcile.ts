/**
 * ============================================================================
 * THE DETERMINISTIC RECONCILER (spec section 4.5)
 * ============================================================================
 *
 * This is the module that separates this build from an API wrapper. The model
 * chooses which findings to surface and writes the rationale prose. It does NOT
 * decide whether a number is real, which way a trend goes, or how risky
 * something is - those are computed here, from the record.
 *
 *   reconcile(finding, member) -> Reconciliation
 *
 * Pure and synchronous: no network, no imports beyond the reference-range table,
 * so the eval harness (`evals/`) can hammer it. The one non-deterministic piece,
 * the advisory LLM judge for `observation` claims, is applied separately by the
 * route (`augmentWithJudge`), never here.
 *
 * Check pipeline, hard checks first:
 *   1. referential-integrity (hard -> rejected) - every cited metric path and
 *      scanDate exists in the record.
 *   2. value-tie-out         (hard -> rejected) - every cited value exactly
 *      equals the record value at that path + date.
 *   3. trend-consistency     (hard -> rejected) - a trend claim's stated
 *      direction matches sign(to - from) recomputed from the record.
 *   4. tier-derivation       (disagreement -> flagged) - the tier is computed by
 *      deriveTier(); a mismatch with the model's proposedTier is surfaced for
 *      the clinician, never enacted.
 *   5. prose-coverage        (soft -> flagged) - numbers in the rationale prose
 *      are backed by the provenance set.
 *
 * verdict: rejected if any of checks 1-3 fail; flagged if only 4/5 do; else grounded.
 */

import type { Finding, Member, Reconciliation, ReconCheck, RiskTier, Scan } from "@/lib/types";
import { deriveTier } from "@/lib/reference-ranges";

const REJECTING_CHECKS = new Set(["referential-integrity", "value-tie-out", "trend-consistency"]);
const FLOAT_EPSILON = 1e-9;

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

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function pass(name: string, severity: ReconCheck["severity"], detail: string): ReconCheck {
  return { name, severity, passed: true, detail };
}
function fail(name: string, severity: ReconCheck["severity"], detail: string): ReconCheck {
  return { name, severity, passed: false, detail };
}

/** Every provenance ref, and the claim's own metric/date(s), resolve in the record. */
function checkReferentialIntegrity(finding: Finding, member: Member): ReconCheck {
  const refs: Array<{ metric: string; scanDate: string }> = [
    ...finding.provenance.map((p) => ({ metric: p.metric, scanDate: p.scanDate })),
  ];
  const c = finding.claim;
  if (c.kind === "level" || c.kind === "observation") {
    refs.push({ metric: c.metric, scanDate: c.scanDate });
  } else {
    refs.push({ metric: c.metric, scanDate: c.fromDate }, { metric: c.metric, scanDate: c.toDate });
  }

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
  return pass("referential-integrity", "hard", "every cited metric path and date exists in the record");
}

/** Every cited value exactly matches the record. This is the reconciliation break. */
function checkValueTieOut(finding: Finding, member: Member): ReconCheck {
  for (const ref of finding.provenance) {
    const actual = readMetric(member, ref.metric, ref.scanDate);
    if (actual === undefined || !valuesEqual(actual, ref.value)) {
      return fail(
        "value-tie-out",
        "hard",
        `provenance says ${ref.metric} = ${ref.value} on ${ref.scanDate}; record has ${actual ?? "nothing"}`,
      );
    }
  }

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
      return fail("value-tie-out", "hard", `claim says ${c.metric} was ${c.from} on ${c.fromDate}; record has ${from ?? "nothing"}`);
    }
    if (to === undefined || !valuesEqual(to, c.to)) {
      return fail("value-tie-out", "hard", `claim says ${c.metric} is ${c.to} on ${c.toDate}; record has ${to ?? "nothing"}`);
    }
  }
  return pass("value-tie-out", "hard", "every cited value ties out to the record exactly");
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

/** Tier is computed from the record. A mismatch with the model is flagged, not enacted. */
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
      check: fail("tier-derivation", "soft", `no reference range for "${c.metric}"; tier not independently derived`),
      derivedTier: finding.proposedTier,
    };
  }
  if (derived !== finding.proposedTier) {
    return {
      check: fail(
        "tier-derivation",
        "hard",
        `model proposed "${finding.proposedTier}"; reference-range tier for ${c.metric} = ${value} is "${derived}"`,
      ),
      derivedTier: derived,
    };
  }
  return {
    check: pass("tier-derivation", "hard", `reference-range tier "${derived}" matches the model's proposal`),
    derivedTier: derived,
  };
}

/** Numbers in the rationale prose are backed by the provenance set. Lenient: soft. */
function checkProseCoverage(finding: Finding, member: Member): ReconCheck {
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
  const uncovered = tokens.filter((tok) => {
    if (/^(19|20)\d\d$/.test(tok)) return false; // years
    if (tok.length === 1) return false; // ordinals, "1-3 sentences" etc.
    const n = Number(tok);
    if (covered.has(tok)) return false;
    return !coveredNums.some((cn) => Math.abs(cn - n) < 0.05);
  });

  if (uncovered.length > 0) {
    return fail(
      "prose-coverage",
      "soft",
      `rationale mentions ${[...new Set(uncovered)].join(", ")} with no matching provenance entry`,
    );
  }
  return pass("prose-coverage", "soft", "every number in the rationale is backed by provenance");
}

// ---------------------------------------------------------------------------
// Entry point
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

/** Reconcile a batch and split it: clinical content vs the "caught" tray. */
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
