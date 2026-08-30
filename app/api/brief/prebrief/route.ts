import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ScanSchema } from "@/lib/schemas";
import { generatePreBrief, PreBriefGenerationError } from "@/lib/ai/prebrief";
import { reconcileResponse } from "@/lib/reconcile-response";
import type { Member } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/brief/prebrief   <Scan>
 *   -> { prebrief, reconciliations, rejected, generated: true, generatedAt }
 *
 * The BRIEF path: input only, live result only. Distinct from POST /api/prebrief,
 * which serves hardcoded synthetic members and falls back to a bundled sample.
 *
 *   - 400  the body is not a shape-valid Scan  -> first Zod issue (the visible
 *          "malformed input rejected" moment; happens with or without a key).
 *   - 503  no ANTHROPIC_API_KEY. Demo never serves a sample; it says so plainly.
 *   - 429  model rate-limited.  502  any other generation failure.
 *   - 200  a pre-brief generated from the uploaded scan ALONE and fully
 *          reconciled against it.
 *
 * TRUST BOUNDARY: the uploaded scan is trusted, STRUCTURED ground truth. It is
 * validated for SHAPE only and then IS the record the reconciler ties against.
 * The record is never extracted from unstructured text by a model.
 */
export async function POST(request: Request) {
  const parsed = ScanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path.join(".") || "(root)";
    return NextResponse.json(
      { error: `Malformed scan at "${path}": ${issue.message}` },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "No ANTHROPIC_API_KEY is configured on the server. The Brief tab generates live only and never shows a sample result. Use the Regression tab to see the reconciler on hardcoded data.",
      },
      { status: 503 },
    );
  }

  // One scan, no prior history: an ephemeral first-visit member. No deltas or
  // trend claims are possible from a single upload, which is the honest shape.
  const member: Member = {
    id: "demo",
    displayName: "Uploaded scan",
    firstVisit: true,
    scans: [parsed.data],
  };

  const generatedAt = new Date().toISOString();

  try {
    const generated = await generatePreBrief(member);
    return NextResponse.json({
      ...(await reconcileResponse(generated, member)),
      generated: true,
      generatedAt,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The model is rate limited. Try again shortly." },
        { status: 429 },
      );
    }
    console.error(
      "[api/brief/prebrief]",
      error instanceof PreBriefGenerationError ? error.cause ?? error : error,
    );
    return NextResponse.json(
      { error: "The pre-brief could not be generated from this scan. Try again." },
      { status: 502 },
    );
  }
}
