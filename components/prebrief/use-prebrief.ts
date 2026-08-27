"use client";

/**
 * Clinician-in-the-loop state for one pre-brief, held in the TanStack Query cache.
 *
 *   ["prebrief", memberId]         the AI output from POST /api/prebrief. Never
 *                                  mutated. Shared with the Member Board card.
 *   ["prebrief-actions", memberId] the clinician's decision per finding, layered
 *                                  on top of the AI output.
 *   ["prebrief-audit", memberId]   an append-only log of every action (Stage 5's
 *                                  Audit Trail reads this).
 *   ["prebrief-signoff", memberId] whether the pre-brief has been signed off.
 *
 * Keeping the AI output immutable and the clinician layer separate mirrors how
 * the real flow works: the model proposes, the clinician disposes, and the
 * disposal is fully logged.
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPreBrief, prebriefQueryKey } from "@/lib/api";
import type { AuditEvent, Finding, FindingStatus, PreBrief } from "@/lib/types";

export type ClinicianDecision = {
  status: Exclude<FindingStatus, "unverified">;
  clinicianEdit?: string;
};

type ActionMap = Record<string, ClinicianDecision>;

const keys = {
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

const EMPTY_FINDINGS: ResolvedFinding[] = [];

export function usePreBrief(memberId: string) {
  const qc = useQueryClient();

  const prebriefQuery = useQuery({
    queryKey: prebriefQueryKey(memberId),
    queryFn: () => fetchPreBrief(memberId),
    staleTime: 5 * 60_000,
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

  const prebrief: PreBrief | undefined = prebriefQuery.data?.prebrief;
  const actions = actionsQuery.data;

  const findings: ResolvedFinding[] = useMemo(() => {
    if (!prebrief) return EMPTY_FINDINGS;
    const order: Record<Finding["riskTier"], number> = { priority: 0, elevated: 1, watch: 2 };
    return [...prebrief.findings]
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
  }, [prebrief, actions]);

  const unresolvedCount = findings.filter((f) => f.status === "unverified").length;
  const total = findings.length;

  return {
    prebrief,
    generated: prebriefQuery.data?.generated ?? false,
    isLoading: prebriefQuery.isPending,
    isError: prebriefQuery.isError,
    error: prebriefQuery.error as Error | null,
    refetch: prebriefQuery.refetch,

    findings,
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
