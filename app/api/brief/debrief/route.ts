import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FinalisedPreBriefSchema } from "@/lib/schemas";
import { generateDebrief, DebriefGenerationError } from "@/lib/ai/debrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/brief/debrief  <FinalisedPreBrief>  ->  { debrief, generated: true, generatedAt }
 *
 * The Brief tab's debrief step, run after the brief is signed off. Live-only,
 * like POST /api/brief/prebrief: no ANTHROPIC_API_KEY means 503, never a template
 * stand-in. The uploaded scan has no member name, so the draft is addressed
 * generically ("Hi there,").
 *
 *   - 400  the body is not a finalised pre-brief (FinalisedPreBriefSchema).
 *   - 503  no API key.
 *   - 429 / 502  model rate-limit / failure.
 */
export async function POST(request: Request) {
  const parsed = FinalisedPreBriefSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected a finalised pre-brief in the request body." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "No ANTHROPIC_API_KEY is configured. The Brief tab drafts the debrief live only." },
      { status: 503 },
    );
  }

  const generatedAt = new Date().toISOString();
  try {
    const debrief = await generateDebrief(parsed.data, "there");
    return NextResponse.json({ debrief, generated: true, generatedAt });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The model is rate limited. Try again shortly." },
        { status: 429 },
      );
    }
    console.error(
      "[api/brief/debrief]",
      error instanceof DebriefGenerationError ? error.cause ?? error : error,
    );
    return NextResponse.json(
      { error: "The debrief could not be generated. Try again." },
      { status: 502 },
    );
  }
}
