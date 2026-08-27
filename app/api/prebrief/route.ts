import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getMemberById } from "@/lib/fixtures";
import { getSamplePreBrief } from "@/lib/fixtures/sample-prebriefs";
import { generatePreBrief, PreBriefGenerationError } from "@/lib/ai/prebrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ memberId: z.string().min(1) });

/**
 * POST /api/prebrief  { memberId }  ->  { prebrief, generated }
 *
 * `generated: true`  the pre-brief came from the Anthropic API.
 * `generated: false` no ANTHROPIC_API_KEY is configured, so the built-in sample
 *                    is returned instead. The UI labels this clearly.
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
    return NextResponse.json({ prebrief: sample, generated: false, generatedAt });
  }

  try {
    const prebrief = await generatePreBrief(member);
    return NextResponse.json({ prebrief, generated: true, generatedAt });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The pre-brief service is rate limited. Try again shortly." },
        { status: 429 },
      );
    }
    // PreBriefGenerationError (invalid output after retry) and any SDK error.
    console.error("[api/prebrief]", error instanceof PreBriefGenerationError ? error.cause ?? error : error);
    return NextResponse.json(
      { error: "The pre-brief could not be generated. Try again." },
      { status: 502 },
    );
  }
}
