import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FinalisedPreBriefSchema } from "@/lib/schemas";
import type { Debrief, FinalisedPreBrief } from "@/lib/types";
import { getMemberById } from "@/lib/fixtures";
import { generateDebrief, DebriefGenerationError } from "@/lib/ai/debrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/debrief  <FinalisedPreBrief>  ->  { debrief, generated, generatedAt }
 *
 * Body is the pre-brief as the clinician finalised it (accepted / edited
 * findings only). `generated: false` means no ANTHROPIC_API_KEY is set and the
 * template fallback below was used instead.
 */
export async function POST(request: Request) {
  const parsed = FinalisedPreBriefSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected a finalised pre-brief in the request body." },
      { status: 400 },
    );
  }

  const finalised = parsed.data;
  const member = getMemberById(finalised.memberId);
  if (!member) {
    return NextResponse.json({ error: "No such member." }, { status: 404 });
  }
  const firstName = member.displayName.split(" ")[0];
  const generatedAt = new Date().toISOString();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      debrief: templateDebrief(finalised, firstName),
      generated: false,
      generatedAt,
    });
  }

  try {
    const debrief = await generateDebrief(finalised, firstName);
    return NextResponse.json({ debrief, generated: true, generatedAt });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The debrief service is rate limited. Try again shortly." },
        { status: 429 },
      );
    }
    console.error(
      "[api/debrief]",
      error instanceof DebriefGenerationError ? error.cause ?? error : error,
    );
    return NextResponse.json(
      { error: "The debrief could not be generated. Try again." },
      { status: 502 },
    );
  }
}

/**
 * Deterministic fallback when no API key is configured. Assembles a plain
 * debrief straight from the finalised pre-brief so the flow is demoable
 * end-to-end. It reads more mechanically than the model's version; the UI
 * labels it as a sample.
 */
function templateDebrief(finalised: FinalisedPreBrief, firstName: string): Debrief {
  const improvements = finalised.deltas
    .filter((d) => d.valence === "improvement")
    .map((d) => d.summary);

  const watch = finalised.findings.map((f) => `${f.title}. ${f.clinicianEdit ?? f.rationale}`);

  return {
    memberId: finalised.memberId,
    greeting: `Hi ${firstName},`,
    summary:
      finalised.findings.length === 0
        ? "Thanks for coming in. Your results this time were reassuring, with nothing that needs action right now."
        : "Thanks for coming in. Most of your results look steady, and there are a couple of things worth keeping an eye on together.",
    whatsGood: improvements.length > 0 ? improvements : ["Your results are broadly stable since your last visit."],
    whatToWatch: watch,
    actionPlan: finalised.draftActionPlan,
    closing: "If anything here raises a question, just reply to this message. We'll see you at your next scan.",
  };
}
