"use client";

/**
 * One append-only audit log per member, held in the TanStack Query cache under
 * ["prebrief-audit", memberId]. Both the pre-brief hook and the debrief hook
 * write here, so the Audit Trail panel sees system suggestions and clinician
 * actions in one timeline (non-negotiable #5).
 */

import type { QueryClient } from "@tanstack/react-query";
import type { AuditEvent } from "@/lib/types";

/** Structured fields that drive the Activity table's columns. */
export type AuditDetail = Pick<AuditEvent, "finding" | "verdict" | "outcome">;

export function auditKey(memberId: string) {
  return ["prebrief-audit", memberId] as const;
}

/** Append a clinician action. Always recorded (actions are never deduped). */
export function recordClinicianEvent(
  qc: QueryClient,
  memberId: string,
  action: string,
  targetId: string,
  detail: AuditDetail = {},
) {
  qc.setQueryData<AuditEvent[]>(auditKey(memberId), (prev = []) => [
    ...prev,
    { at: new Date().toISOString(), actor: "clinician", action, targetId, ...detail },
  ]);
}

/**
 * Append a system event once. System suggestions are derived from AI output that
 * can be re-fetched, so this is a no-op if an identical event is already logged.
 */
export function seedSystemEvent(
  qc: QueryClient,
  memberId: string,
  action: string,
  targetId: string,
  at: string,
  detail: AuditDetail = {},
) {
  qc.setQueryData<AuditEvent[]>(auditKey(memberId), (prev = []) => {
    if (prev.some((e) => e.actor === "system" && e.action === action && e.targetId === targetId)) {
      return prev;
    }
    return [...prev, { at, actor: "system", action, targetId, ...detail }];
  });
}
