/**
 * ============================================================================
 * DEBRIEF GENERATION - member-facing. SERVER ONLY.
 * ============================================================================
 *
 * Takes the pre-brief as the clinician finalised it and drafts the message the
 * member will read. Same discipline as `prebrief.ts`:
 *
 *   #4 VALIDATE ALL AI OUTPUT - the response is parsed as JSON and checked
 *      against `DebriefDraftSchema`; one retry with the error fed back, then it
 *      throws. Unvalidated output never returns.
 *   The debrief may only restate what the finalised pre-brief already contains -
 *   the prompt forbids new clinical claims. The clinician has already signed off
 *   on the substance; this step is a voice change, not a new assessment.
 *
 * The JSON contract in SYSTEM_PROMPT must stay in sync with `DebriefDraftSchema`.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { DebriefDraftSchema, DebriefSchema } from "@/lib/schemas";
import type { Debrief, FinalisedPreBrief } from "@/lib/types";

type DebriefDraft = z.infer<typeof DebriefDraftSchema>;

export class DebriefGenerationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "DebriefGenerationError";
  }
}

const MODEL = "claude-opus-5";
const MAX_TOKENS = 4_000;
const MAX_ATTEMPTS = 2;

const SYSTEM_PROMPT = `You write the message a member of a preventive-health clinic reads after their
visit. A clinician has already reviewed and signed off the findings; your job is a voice change,
not a new assessment.

Voice: calm, warm, plainly on the member's side. Second person ("your"). Short sentences. No
medical jargon, no scare language, no em dashes. Explain numbers in everyday terms.

Return ONE JSON object and nothing else. No markdown, no code fences. It must match exactly:

{
  "greeting": string,        // e.g. "Hi Elin,"
  "summary": string,         // 2-3 sentences: the overall picture from this visit
  "whatsGood": [string],     // plain-language positives; may be empty
  "whatToWatch": [string],   // things to keep an eye on, phrased without alarm; may be empty
  "actionPlan": [string],    // concrete next steps, in order
  "closing": string          // one warm sign-off line
}

Rules:
- Only restate what the finalised pre-brief below contains. Do not introduce any finding,
  number, or recommendation that is not there.
- "whatToWatch" comes from the findings. "whatsGood" comes from improvements in the deltas.
  "actionPlan" comes from the draft action plan.
- If there are no findings, "whatToWatch" can be an empty array and the summary should say the
  results were reassuring.
- Keep the whole thing readable in under a minute.`;

function buildUserMessage(finalised: FinalisedPreBrief, memberName: string): string {
  return [
    `Member first name: ${memberName}`,
    "",
    "Finalised pre-brief (clinician-signed):",
    "```json",
    JSON.stringify(finalised, null, 2),
    "```",
    "",
    "Write the member debrief JSON object now.",
  ].join("\n");
}

function unwrapJson(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return (fence ? fence[1] : trimmed).trim();
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export async function generateDebrief(
  finalised: FinalisedPreBrief,
  memberName: string,
): Promise<Debrief> {
  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserMessage(finalised, memberName) },
  ];

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      });
      raw = extractText(response);
    } catch (err) {
      throw new DebriefGenerationError("The debrief service call failed.", err);
    }

    const parsed = safeParseDraft(raw);
    if (parsed.ok) {
      return DebriefSchema.parse({ ...parsed.value, memberId: finalised.memberId });
    }

    lastError = parsed.error;
    console.warn(
      `[debrief] attempt ${attempt}/${MAX_ATTEMPTS} produced invalid output: ${parsed.error}`,
    );
    messages.push(
      { role: "assistant", content: raw },
      {
        role: "user",
        content: `That response was not valid. ${parsed.error}\nReturn only the corrected JSON object.`,
      },
    );
  }

  throw new DebriefGenerationError(
    "The debrief could not be generated in a valid format.",
    lastError,
  );
}

type DraftResult = { ok: true; value: DebriefDraft } | { ok: false; error: string };

function safeParseDraft(raw: string): DraftResult {
  let json: unknown;
  try {
    json = JSON.parse(unwrapJson(raw));
  } catch {
    return { ok: false, error: "Response was not parseable JSON." };
  }
  const result = DebriefDraftSchema.safeParse(json);
  if (result.success) return { ok: true, value: result.data };
  const first = result.error.issues[0];
  const where = first?.path.join(".") || "(root)";
  return { ok: false, error: `Schema check failed at ${where}: ${first?.message ?? "unknown"}.` };
}
