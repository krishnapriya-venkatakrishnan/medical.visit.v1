/**
 * Client-side access to the pre-brief and debrief endpoints.
 *
 * The Member Board card and the Pre-Brief screen both call `fetchPreBrief` under
 * `prebriefQueryKey`, so opening a member reuses whatever the board fetched.
 */

import type {
  Claim,
  Debrief,
  DeltaReconciliation,
  FinalisedPreBrief,
  PreBrief,
  Reconciliation,
  RiskTier,
} from "@/lib/types";

/**
 * Something the reconciler rejected, shown in the "Caught by reconciler" tray.
 * `kind` distinguishes a fabricated finding from a fabricated change (delta).
 */
export interface RejectedItem {
  kind: "finding" | "delta";
  id: string;
  title: string;
  /** Findings only. */
  claim?: Claim;
  /** Findings only. */
  proposedTier?: RiskTier;
  failedCheck: { name: string; detail: string } | null;
}

export interface PreBriefResponse {
  prebrief: PreBrief;
  /**
   * Reconciliation for every returned finding (keyed by finding id) and every
   * grounded delta (keyed by delta id). Finding and delta ids do not collide.
   */
  reconciliations: Record<string, Reconciliation | DeltaReconciliation>;
  /** Findings and deltas the reconciler rejected before they could render. */
  rejected: RejectedItem[];
  /** false when the server returned the built-in sample (no API key configured). */
  generated: boolean;
  generatedAt: string;
}

export interface DebriefResponse {
  debrief: Debrief;
  /** false when the server returned the template fallback (no API key configured). */
  generated: boolean;
  generatedAt: string;
}

export function prebriefQueryKey(memberId: string) {
  return ["prebrief", memberId] as const;
}

export function debriefQueryKey(memberId: string) {
  return ["debrief", memberId] as const;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request to ${url} failed (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export function fetchPreBrief(memberId: string): Promise<PreBriefResponse> {
  return postJson<PreBriefResponse>("/api/prebrief", { memberId });
}

export function fetchDebrief(finalised: FinalisedPreBrief): Promise<DebriefResponse> {
  return postJson<DebriefResponse>("/api/debrief", finalised);
}
