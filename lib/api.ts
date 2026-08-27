/**
 * Client-side access to the pre-brief endpoint. Both the Member Board card and
 * the Pre-Brief screen call `fetchPreBrief` under the same query key, so opening
 * a member reuses whatever the board already fetched.
 */

import type { PreBrief } from "@/lib/types";

export interface PreBriefResponse {
  prebrief: PreBrief;
  /** false when the server returned the built-in sample (no API key configured). */
  generated: boolean;
}

export function prebriefQueryKey(memberId: string) {
  return ["prebrief", memberId] as const;
}

export async function fetchPreBrief(memberId: string): Promise<PreBriefResponse> {
  const res = await fetch("/api/prebrief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ memberId }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Pre-brief request failed (${res.status}).`);
  }

  return res.json() as Promise<PreBriefResponse>;
}
