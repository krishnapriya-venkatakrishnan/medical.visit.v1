/**
 * Client-side access to the pre-brief and debrief endpoints.
 *
 * The Member Board card and the Pre-Brief screen both call `fetchPreBrief` under
 * `prebriefQueryKey`, so opening a member reuses whatever the board fetched.
 *
 * Two pre-brief paths, deliberately distinct:
 *   - `fetchPreBrief`     REGRESSION. Hardcoded synthetic members. Falls back to
 *                         a bundled sample pre-brief when no API key is set.
 *   - `runDemoPreBrief`   DEMO. An uploaded scan in, a live reconciled result
 *                         out. Never a sample: no key -> a clear error, not a
 *                         stand-in result.
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
   * The model's response as it came back (shape-validated, pre-reconciler):
   * every proposed finding and delta, including the ones the reconciler went on
   * to reject. This is what the "full AI response" view shows.
   */
  raw: PreBrief;
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

/** An error from an API call that keeps the HTTP status, so callers can branch on it. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, payload?.error ?? `Request to ${url} failed (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

export function fetchPreBrief(memberId: string): Promise<PreBriefResponse> {
  return postJson<PreBriefResponse>("/api/prebrief", { memberId });
}

export function fetchDebrief(finalised: FinalisedPreBrief): Promise<DebriefResponse> {
  return postJson<DebriefResponse>("/api/debrief", finalised);
}

/**
 * DEMO path. `scan` is whatever the user pasted / uploaded, parsed to an object.
 * The server validates it against `ScanSchema` (400 with the first Zod issue on
 * failure), then generates and reconciles a pre-brief from that scan alone.
 * With no API key the server returns 503: the Demo tab never shows a sample.
 */
export function runDemoPreBrief(scan: unknown): Promise<PreBriefResponse> {
  return postJson<PreBriefResponse>("/api/demo/prebrief", scan);
}

/**
 * DEMO debrief. Posts the pre-brief as the clinician signed it off and gets a
 * member-facing draft back. Live-only, like `runDemoPreBrief`: no key -> 503.
 */
export function runDemoDebrief(finalised: FinalisedPreBrief): Promise<DebriefResponse> {
  return postJson<DebriefResponse>("/api/demo/debrief", finalised);
}
