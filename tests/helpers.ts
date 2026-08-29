import type Anthropic from "@anthropic-ai/sdk";
import type { Finding } from "@/lib/types";

/** Fill in the clinician-only `status` so a bare finding shape can be reconciled. */
export function mkFinding(f: Omit<Finding, "status">): Finding {
  return { ...f, status: "unverified" };
}

/**
 * Minimal fake of a non-streaming Anthropic response carrying one text block.
 * The generators only read `message.content`, so the rest is irrelevant here.
 */
export function textMessage(text: string): Anthropic.Message {
  return { content: [{ type: "text", text }] } as unknown as Anthropic.Message;
}
