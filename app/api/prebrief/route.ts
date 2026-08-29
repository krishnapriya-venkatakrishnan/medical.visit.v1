import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getMemberById } from "@/lib/fixtures";
import { getSamplePreBrief } from "@/lib/fixtures/sample-prebriefs";
import { generatePreBrief, PreBriefGenerationError } from "@/lib/ai/prebrief";
import { reconcileResponse } from "@/lib/reconcile-response";

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
 * includes a finding that fails, so the tray is populated in the demo). This is
 * the REGRESSION path: hardcoded synthetic members. The live-only, input-only
 * path is POST /api/demo/prebrief.
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
