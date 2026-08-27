"use client";

/**
 * Clinician-in-the-loop state for one pre-brief, held in the TanStack Query cache.
 *
 * Three cache entries, deliberately separate:
 *   ["prebrief", memberId]         the AI output (Stage 3: the sample; Stage 4:
 *                                  the response from /api/prebrief). Never mutated.
 *   ["prebrief-actions", memberId] the clinician's decision per finding, layered
 *                                  on top of the AI output.
 *   ["prebrief-audit", memberId]   an append-only log of every action (the
 *                                  Stage 5 Audit Trail reads this).
 *   ["prebrief-signoff", memberId] whether the pre-brief has been signed off.
 *
 * Keeping the AI output immutable and the clinician layer separate mirrors how
 * Stage 4/5 work: the model proposes, the human disposes, and the disposal is
 * fully logged.
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuditEvent, Finding, FindingStatus, PreBrief } from "@/lib/types";

export type ClinicianDecision = {
  status: Exclude<FindingStatus, "unverified">;
  clinicianEdit?: string;
};

type ActionMap = Record<string, ClinicianDecision>;

const keys = {
  prebrief: (id: string) => ["prebrief", id] as const,
  actions: (id: string) => ["prebrief-actions", id] as const,
  audit: (id: string) => ["prebrief-audit", id] as const,
  signoff: (id: string) => ["prebrief-signoff", id] as const,
};

function decisionVerb(d: ClinicianDecision): string {
  if (d.status === "accepted") return "Accepted finding";
  if (d.status === "edited") return "Edited finding";
  return "Dismissed finding";
}

export interface ResolvedFinding extends Finding {
  /** The text to show: the clinician's edit when present, otherwise the rationale. */
  displayText: string;
}

export function usePreBrief(memberId: string, sample: PreBrief) {
  const qc = useQueryClient();

  // Stage 4 replaces this queryFn with a fetch to /api/prebrief. Until then the
  // sample is both the initialData and what the queryFn returns.
  const prebriefQuery = useQuery({
    queryKey: keys.prebrief(memberId),
    queryFn: async (): Promise<PreBrief> => sample,
    initialData: sample,
    staleTime: Infinity,
  });

  const actionsQuery = useQuery({
    queryKey: keys.actions(memberId),
    queryFn: async (): Promise<ActionMap> => ({}),
    initialData: {} as ActionMap,
    staleTime: Infinity,
  });

  const auditQuery = useQuery({
    queryKey: keys.audit(memberId),
    queryFn: async (): Promise<AuditEvent[]> => [],
    initialData: [] as AuditEvent[],
    staleTime: Infinity,
  });

  const signoffQuery = useQuery({
    queryKey: keys.signoff(memberId),
    queryFn: async (): Promise<boolean> => false,
    initialData: false,
    staleTime: Infinity,
  });

  const appendAudit = useCallback(
    (action: string, targetId: string) => {
      qc.setQueryData<AuditEvent[]>(keys.audit(memberId), (prev = []) => [
        ...prev,
        { at: new Date().toISOString(), actor: "clinician", action, targetId },
      ]);
    },
    [qc, memberId],
  );

  // Stage 4/5 give this mutation a real mutationFn (POST the decision). For now
  // it just updates the cache and the audit log.
  const decide = useMutation({
    mutationFn: async (input: { findingId: string; decision: ClinicianDecision }) => input,
    onSuccess: ({ findingId, decision }) => {
      qc.setQueryData<ActionMap>(keys.actions(memberId), (prev = {}) => ({
        ...prev,
        [findingId]: decision,
      }));
      appendAudit(decisionVerb(decision), findingId);
    },
  });

  const reopen = useMutation({
    mutationFn: async (findingId: string) => findingId,
    onSuccess: (findingId) => {
      qc.setQueryData<ActionMap>(keys.actions(memberId), (prev = {}) => {
        const next = { ...prev };
        delete next[findingId];
        return next;
      });
      appendAudit("Reopened finding", findingId);
    },
  });

  const signOff = useMutation({
    mutationFn: async () => true,
    onSuccess: () => {
      qc.setQueryData<boolean>(keys.signoff(memberId), true);
      appendAudit("Signed off pre-brief", memberId);
    },
  });

  const actions = actionsQuery.data;

  const resolvedFindings: ResolvedFinding[] = useMemo(() => {
    const order: Record<Finding["riskTier"], number> = { priority: 0, elevated: 1, watch: 2 };
    return [...prebriefQuery.data.findings]
      .map((f): ResolvedFinding => {
        const decision = actions[f.id];
        if (!decision) return { ...f, displayText: f.rationale };
        return {
          ...f,
          status: decision.status,
          clinicianEdit: decision.clinicianEdit,
          displayText: decision.clinicianEdit ?? f.rationale,
        };
      })
      .sort((a, b) => order[a.riskTier] - order[b.riskTier]);
  }, [prebriefQuery.data.findings, actions]);

  const unresolvedCount = resolvedFindings.filter((f) => f.status === "unverified").length;
  const total = resolvedFindings.length;

  return {
    prebrief: prebriefQuery.data,
    findings: resolvedFindings,
    audit: auditQuery.data,
    isSignedOff: signoffQuery.data,
    unresolvedCount,
    resolvedCount: total - unresolvedCount,
    total,
    canSignOff: unresolvedCount === 0 && !signoffQuery.data,
    decide: (findingId: string, decision: ClinicianDecision) =>
      decide.mutate({ findingId, decision }),
    reopen: (findingId: string) => reopen.mutate(findingId),
    signOff: () => signOff.mutate(),
  };
}
