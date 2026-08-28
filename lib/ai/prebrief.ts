/**
 * ============================================================================
 * PRE-BRIEF GENERATION - the AI boundary. SERVER ONLY.
 * ============================================================================
 *
 * This is the module reviewers will read most closely, so it is heavily
 * commented. It does one job: turn a member's longitudinal record into a
 * schema-valid `PreBrief` by asking Claude, and refuse to return anything that
 * does not validate.
 *
 * How the five non-negotiables show up here:
 *
 *   #2 EVERY AI CLAIM HAS PROVENANCE - the prompt requires a `provenance` array
 *      on every finding and every delta, each entry naming the exact scan field,
 *      its value, and the scan date. `PreBriefDraftSchema` then rejects any
 *      finding/delta with an empty `provenance`, so an unsourced claim can never
 *      reach the UI.
 *
 *   #3 SYNTHETIC DATA ONLY - the only input is a synthetic fixture record. The
 *      prompt also forbids inventing data points that are not in the record.
 *
 *   #4 VALIDATE ALL AI OUTPUT - the response text is parsed as JSON and run
 *      through Zod. On failure we retry exactly once with the validation error
 *      fed back to the model; a second failure throws. Unvalidated model output
 *      is never returned.
 *
 *   ANTHROPIC_API_KEY stays server-side: this file imports "server-only" and is
 *      only ever reached from the route handler.
 *
 * The JSON contract in `SYSTEM_PROMPT` is written by hand rather than generated
 * from the Zod schema, so it reads clearly. It MUST be kept in sync with
 * `PreBriefDraftSchema` in `lib/schemas.ts` - if you change one, change the other.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { anthropic } from "@/lib/ai/client";
import { PreBriefDraftSchema, PreBriefSchema } from "@/lib/schemas";
import type { Member, PreBrief } from "@/lib/types";

type PreBriefDraft = z.infer<typeof PreBriefDraftSchema>;

/** Thrown when the model cannot produce schema-valid output after one retry. */
export class PreBriefGenerationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "PreBriefGenerationError";
  }
}

// Opus 5 by default: strongest reasoning, which is what risk-ranking and
// provenance tracing need. Override with ANTHROPIC_MODEL (e.g. "claude-sonnet-5")
// when the key lacks Opus 5 access. Thinking is on by default; response is JSON only.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const MAX_TOKENS = 8_000;
const MAX_ATTEMPTS = 2; // one initial attempt + one retry

const SYSTEM_PROMPT = `You are a clinical pre-brief assistant for a preventive-health clinic. A
clinician is about to see a member. From the member's longitudinal scan record you produce a
structured pre-brief that the clinician will review, edit, and sign off. You are drafting for a
clinician, not diagnosing, and the clinician makes every decision.

Return ONE JSON object and nothing else. No markdown, no code fences, no commentary before or
after. The object must match exactly this shape:

{
  "memberId": string,                       // echo the member id you were given
  "headline": string,                       // one plain-language sentence summarising readiness
  "deltas": [                               // changes since the previous scan; [] if first visit
    {
      "id": string,                         // short stable slug, e.g. "delta-ldl"
      "metric": string,                     // human label, e.g. "LDL cholesterol"
      "previousValue": string | number,
      "currentValue": string | number,
      "unit": string,                       // optional; omit if not meaningful
      "direction": "up" | "down" | "unchanged",
      "valence": "improvement" | "concern" | "neutral",
      "summary": string,                    // one sentence, plain language
      "provenance": [
        { "metric": string, "value": string | number, "scanDate": string }
      ]
    }
  ],
  "findings": [                             // most serious first; [] if nothing to flag
    {
      "id": string,                         // short stable slug, e.g. "finding-mole"
      "title": string,                      // short noun phrase
      "rationale": string,                  // 1-3 sentences a clinician would accept; prose only
      "claim":                              // the FACTUAL claim, in ONE of these shapes:
        { "kind": "level",  "metric": string, "value": number, "scanDate": string }
      | { "kind": "trend",  "metric": string, "from": number, "fromDate": string,
                            "to": number, "toDate": string, "direction": "up" | "down" }
      | { "kind": "observation", "metric": string, "scanDate": string, "note": string },
      "proposedTier": "good" | "watch" | "elevated" | "priority",   // your suggestion only
      "provenance": [
        { "metric": string, "value": string | number, "scanDate": string }
      ]
    }
  ],
  "talkingPoints": [string],                // starting points for the consultation
  "draftActionPlan": [string]               // proposed next steps, ordered
}

Rules:
- "metric" is a dotted path into a scan, e.g. "blood.ldl", "heart.bpSystolic",
  "body.visceralFatIndex", "skin.flagged[0].changeMm". "scanDate" must be a real scan date.
- Every finding's "claim" is checked against the record by a deterministic reconciler:
  every value must EXACTLY equal what the record holds at that path and date, and a "trend"
  direction must match the actual change. A claim that does not tie out is discarded, so do
  not round, estimate, or infer - copy the exact numbers from the record.
- Use "level" for a single value that matters, "trend" for a change between two scans, and
  "observation" only for something with no number to check (e.g. lesion morphology).
- Every finding and every delta MUST have at least one provenance entry naming a real metric
  path, value and date.
- "proposedTier" is only a suggestion. The displayed tier is computed from the record, so an
  inflated tier will simply be corrected and flagged. Do not inflate.
- For a first visit there is no prior scan, so "deltas" must be [] and no "trend" claims.
- Do NOT include "status" or "clinicianEdit". Those belong to the clinician.
- Keep language calm, specific, and free of em dashes.`;

/** Builds the user turn: the member record as JSON, plus a short instruction. */
function buildUserMessage(member: Member): string {
  return [
    `Member id: ${member.id}`,
    `First visit: ${member.firstVisit}`,
    "",
    "Longitudinal record (oldest scan first, last scan is today):",
    "```json",
    JSON.stringify(member, null, 2),
    "```",
    "",
    "Produce the pre-brief JSON object now.",
  ].join("\n");
}

/** Strips an optional ```json ... ``` fence the model may add despite instructions. */
function unwrapJson(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return (fence ? fence[1] : trimmed).trim();
}

/** Concatenates the text blocks of an Anthropic response (ignores thinking blocks). */
function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Generate a validated pre-brief for `member`. Throws `PreBriefGenerationError`
 * if the model never returns schema-valid JSON.
 *
 * The caller must have ANTHROPIC_API_KEY set; the route handler checks that and
 * falls back to a sample when it is missing.
 */
export async function generatePreBrief(member: Member): Promise<PreBrief> {
  const client = anthropic();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserMessage(member) },
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
      // Network / rate limit / auth: let the route map this to a clean status.
      throw new PreBriefGenerationError("The pre-brief service call failed.", err);
    }

    // #4: parse as JSON, then validate against the draft schema (which forbids
    // clinician-only fields and requires provenance on every finding/delta).
    const parsed = safeParseDraft(raw);
    if (parsed.ok) {
      // Re-parse through the full schema so finding.status defaults to
      // "unverified", and force the member id so a model echo error can't
      // mis-attribute the pre-brief.
      return PreBriefSchema.parse({ ...parsed.value, memberId: member.id });
    }

    lastError = parsed.error;
    console.warn(
      `[prebrief] attempt ${attempt}/${MAX_ATTEMPTS} produced invalid output: ${parsed.error}`,
    );

    // Feed the failure back so the retry can correct it.
    messages.push(
      { role: "assistant", content: raw },
      {
        role: "user",
        content: `That response was not valid. ${parsed.error}\nReturn only the corrected JSON object.`,
      },
    );
  }

  throw new PreBriefGenerationError(
    "The pre-brief could not be generated in a valid format.",
    lastError,
  );
}

type DraftResult =
  | { ok: true; value: PreBriefDraft }
  | { ok: false; error: string };

function safeParseDraft(raw: string): DraftResult {
  let json: unknown;
  try {
    json = JSON.parse(unwrapJson(raw));
  } catch {
    return { ok: false, error: "Response was not parseable JSON." };
  }

  const result = PreBriefDraftSchema.safeParse(json);
  if (result.success) return { ok: true, value: result.data };

  const first = result.error.issues[0];
  const where = first?.path.join(".") || "(root)";
  return { ok: false, error: `Schema check failed at ${where}: ${first?.message ?? "unknown"}.` };
}
