import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getMemberById } from "@/lib/fixtures";
import { getSamplePreBrief } from "@/lib/fixtures/sample-prebriefs";
import { generatePreBrief, PreBriefGenerationError } from "@/lib/ai/prebrief";
import {
  reconcileDeltas,
  reconcileFindings,
  type ReconciledDelta,
  type ReconciledFinding,
} from "@/lib/reconcile";
import { judgeObservation } from "@/lib/ai/judge";
import type { DeltaReconciliation, Member, PreBrief, Reconciliation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ memberId: z.string().min(1) });

/**
 * POST /api/prebrief  { memberId }
 *   -> { prebrief, reconciliations, rejected, generated, generatedAt }
 *
 * The model proposes; the deterministic reconciler (lib/reconcile.ts) disposes.
 * Every finding AND every delta is reconciled against the record before return:
 *   - grounded / flagged  -> `prebrief.findings` / `prebrief.deltas`, with its
 *                            reconciliation in `reconciliations` (keyed by id).
 *   - rejected            -> `rejected` (each item tagged kind "finding" or
 *                            "delta"), never sent as clinical content; the UI
 *                            shows it in the "Caught by reconciler" tray.
 *
 * `generated: false` means no ANTHROPIC_API_KEY, so the built-in sample stands in
 * for the model output (it is still reconciled - the sample deliberately
 * includes a finding that fails, so the tray is populated in the demo).
 *
 * The key is only ever read here, server-side.
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected a JSON body with a memberId." }, { status: 400 });
  }

  const member = getMemberById(parsed.data.memberId);
  if (!member) {
    return NextResponse.json({ error: "No such member." }, { status: 404 });
  }

  const generatedAt = new Date().toISOString();

  if (!process.env.ANTHROPIC_API_KEY) {
    const sample = getSamplePreBrief(member.id);
    if (!sample) {
      return NextResponse.json(
        { error: "No API key configured and no sample pre-brief for this member." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ...(await reconcileResponse(sample, member)), generated: false, generatedAt });
  }

  try {
    const generated = await generatePreBrief(member);
    return NextResponse.json({ ...(await reconcileResponse(generated, member)), generated: true, generatedAt });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The pre-brief service is rate limited. Try again shortly." },
        { status: 429 },
      );
    }
    console.error(
      "[api/prebrief]",
      error instanceof PreBriefGenerationError ? error.cause ?? error : error,
    );
    return NextResponse.json(
      { error: "The pre-brief could not be generated. Try again." },
      { status: 502 },
    );
  }
}

async function reconcileResponse(prebrief: PreBrief, member: Member) {
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
    reconciliations,
    rejected: [...rejected.map(serialiseRejectedFinding), ...deltas.rejected.map(serialiseRejectedDelta)],
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
