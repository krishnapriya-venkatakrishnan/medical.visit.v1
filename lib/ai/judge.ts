/**
 * Advisory LLM judge for `observation` claims - SERVER ONLY (spec section 4.5).
 *
 * Arithmetic cannot verify an observation (e.g. mole morphology - there is no
 * number to tie out). This is the ONLY place a second model runs, and it is
 * strictly advisory: it can move a verdict from grounded to flagged, never the
 * other way, and it never accepts anything. Numeric claims are grounded
 * deterministically by `reconcile()`; observational claims are additionally
 * reviewed here.
 *
 * If no ANTHROPIC_API_KEY is set the judge is skipped and reported as such.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic } from "@/lib/ai/client";
import type { Claim, Member, ReconCheck } from "@/lib/types";

// Same default and override as prebrief.ts (see ANTHROPIC_MODEL in .env.example).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

const VerdictSchema = z.object({
  supported: z.boolean(),
  reason: z.string(),
});

const SYSTEM_PROMPT = `You review a single observational claim about a member's scan against the raw
record. Decide only whether the record supports the claim as stated. You are advisory: you can
raise a concern, you cannot approve anything.

Return ONE JSON object, no prose, no fences:
{ "supported": boolean, "reason": string }

"supported": true only if the observation is a fair reading of what the record contains.
"reason": one sentence.`;

/**
 * Returns a soft `ReconCheck` to append to the finding's reconciliation.
 * `passed: false` should downgrade a `grounded` verdict to `flagged`.
 */
export async function judgeObservation(claim: Claim, member: Member): Promise<ReconCheck> {
  if (claim.kind !== "observation") {
    return { name: "observation-judge", severity: "soft", passed: true, detail: "not an observational claim" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      name: "observation-judge",
      severity: "soft",
      passed: true,
      detail: "advisory judge not run (no API key configured)",
    };
  }

  try {
    const client = anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1_000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `Observation claim: metric "${claim.metric}", scan ${claim.scanDate}.`,
            `Note: ${claim.note}`,
            "",
            "Record:",
            "```json",
            JSON.stringify(member, null, 2),
            "```",
            "",
            "Return the JSON verdict.",
          ].join("\n"),
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*\n?|\n?```$/g, "");

    const parsed = VerdictSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return {
        name: "observation-judge",
        severity: "soft",
        passed: true,
        detail: "advisory judge returned an unreadable verdict; ignored",
      };
    }
    return {
      name: "observation-judge",
      severity: "soft",
      passed: parsed.data.supported,
      detail: `advisory judge: ${parsed.data.supported ? "supported" : "not supported"} - ${parsed.data.reason}`,
    };
  } catch {
    return {
      name: "observation-judge",
      severity: "soft",
      passed: true,
      detail: "advisory judge call failed; ignored",
    };
  }
}
