/**
 * Runs the deterministic reconciler eval cases and scores them, so the Harness
 * suite tab and `tests/harness-catalog.test.ts` share one implementation and the
 * tab can never show a green that CI would call red.
 *
 * Pure and synchronous. Imports only `lib/reconcile.ts` (no server-only) and the
 * frozen cases from `evals/cases.ts`. The cases themselves are never modified
 * here; `evals/run.ts` stays the source of truth for `npm run eval`.
 */

import { reconcile, reconcileDelta } from "@/lib/reconcile";
import {
  adversarialCases,
  adversarialDeltas,
  cleanCases,
  cleanDeltas,
  record,
} from "@/evals/cases";
import type { ReconCheck } from "@/lib/types";

export type Verdict = "grounded" | "flagged" | "rejected";

export interface CatalogRow {
  name: string;
  kind: "finding" | "delta";
  group: "clean" | "adversarial";
  /** "grounded" for the clean set; the case's own expectation for the adversarial set. */
  expected: Verdict;
  actual: Verdict;
  derivedTier?: string;
  /** clean: passes when grounded. adversarial: passes when caught (not grounded). */
  pass: boolean;
  /** Whether the exact verdict matched `expected` (adversarial rows can pass without matching). */
  matched: boolean;
  checks: ReconCheck[];
}

export interface CatalogResult {
  rows: CatalogRow[];
  cleanTotal: number;
  cleanRejected: number;
  adversarialTotal: number;
  caught: number;
  catchRate: number;
  falseRejectionRate: number;
  allGreen: boolean;
}

export function runDeterministicCatalog(): CatalogResult {
  const rows: CatalogRow[] = [];

  for (const { name, finding } of cleanCases) {
    const { verdict, derivedTier, checks } = reconcile(finding, record);
    rows.push({
      name,
      kind: "finding",
      group: "clean",
      expected: "grounded",
      actual: verdict,
      derivedTier,
      pass: verdict === "grounded",
      matched: verdict === "grounded",
      checks,
    });
  }

  for (const { name, delta } of cleanDeltas) {
    const { verdict, checks } = reconcileDelta(delta, record);
    rows.push({
      name,
      kind: "delta",
      group: "clean",
      expected: "grounded",
      actual: verdict,
      pass: verdict === "grounded",
      matched: verdict === "grounded",
      checks,
    });
  }

  for (const { name, finding, expect } of adversarialCases) {
    const { verdict, derivedTier, checks } = reconcile(finding, record);
    rows.push({
      name,
      kind: "finding",
      group: "adversarial",
      expected: expect,
      actual: verdict,
      derivedTier,
      pass: verdict !== "grounded",
      matched: verdict === expect,
      checks,
    });
  }

  for (const { name, delta, expect } of adversarialDeltas) {
    const { verdict, checks } = reconcileDelta(delta, record);
    rows.push({
      name,
      kind: "delta",
      group: "adversarial",
      expected: expect,
      actual: verdict,
      pass: verdict !== "grounded",
      matched: verdict === expect,
      checks,
    });
  }

  const cleanRows = rows.filter((r) => r.group === "clean");
  const adversarialRows = rows.filter((r) => r.group === "adversarial");
  const cleanRejected = cleanRows.filter((r) => r.actual === "rejected").length;
  const caught = adversarialRows.filter((r) => r.pass).length;

  return {
    rows,
    cleanTotal: cleanRows.length,
    cleanRejected,
    adversarialTotal: adversarialRows.length,
    caught,
    catchRate: (caught / adversarialRows.length) * 100,
    falseRejectionRate: (cleanRejected / cleanRows.length) * 100,
    allGreen: rows.every((r) => r.pass),
  };
}
