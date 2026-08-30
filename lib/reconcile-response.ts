/**
 * Shared server-side step: take a model-produced pre-brief, run every finding and
 * every delta through the deterministic reconciler, apply the advisory judge to
 * observational claims, and shape the result for the client.
 *
 * Used by both `POST /api/prebrief` (fixture members, with a sample fallback when
 * no API key) and `POST /api/brief/prebrief` (an uploaded scan, live only, no
 * fallback). The reconciler is the same in both paths - that is the point.
 */

import "server-only";

import {
  reconcileDeltas,
  reconcileFindings,
  type ReconciledDelta,
  type ReconciledFinding,
} from "@/lib/reconcile";
import { judgeObservation } from "@/lib/ai/judge";
import type { DeltaReconciliation, Member, PreBrief, Reconciliation } from "@/lib/types";

export async function reconcileResponse(prebrief: PreBrief, member: Member) {
  const { clinical, rejected } = reconcileFindings(prebrief.findings, member);
  const deltas = reconcileDeltas(prebrief.deltas, member);

  // Advisory judge for observational claims only (spec section 4.5). It can move
  // a verdict from grounded to flagged, never the other way.
  await Promise.all(
    clinical.map(async (item) => {
      if (item.finding.claim.kind !== "observation") return;
      const check = await judgeObservation(item.finding.claim, member);
      item.reconciliation.checks.push(check);
      if (!check.passed && item.reconciliation.verdict === "grounded") {
        item.reconciliation.verdict = "flagged";
      }
    }),
  );

  const reconciliations: Record<string, Reconciliation | DeltaReconciliation> = {};
  for (const { finding, reconciliation } of [...clinical, ...rejected]) {
    reconciliations[finding.id] = reconciliation;
  }
  for (const { delta, reconciliation } of [...deltas.grounded, ...deltas.rejected]) {
    reconciliations[delta.id] = reconciliation;
  }

  return {
    prebrief: {
      ...prebrief,
      deltas: deltas.grounded.map((d) => d.delta),
      findings: clinical.map((c) => c.finding),
    },
    // The model's response untouched: every proposed finding and delta, so the
    // "full AI response" view can show what was rejected, not only what survived.
    raw: prebrief,
    reconciliations,
    rejected: [
      ...rejected.map(serialiseRejectedFinding),
      ...deltas.rejected.map(serialiseRejectedDelta),
    ],
  };
}

function firstFailure(checks: { name: string; detail: string; passed: boolean }[]) {
  const failed = checks.find((c) => !c.passed);
  return failed ? { name: failed.name, detail: failed.detail } : null;
}

function serialiseRejectedFinding({ finding, reconciliation }: ReconciledFinding) {
  return {
    kind: "finding" as const,
    id: finding.id,
    title: finding.title,
    claim: finding.claim,
    proposedTier: finding.proposedTier,
    failedCheck: firstFailure(reconciliation.checks),
  };
}

function serialiseRejectedDelta({ delta, reconciliation }: ReconciledDelta) {
  return {
    kind: "delta" as const,
    id: delta.id,
    title: delta.metric,
    failedCheck: firstFailure(reconciliation.checks),
  };
}
