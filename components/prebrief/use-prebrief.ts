"use client";

/**
 * Clinician-in-the-loop state for one pre-brief, held in the TanStack Query cache.
 *
 *   ["prebrief", memberId]         the AI output from POST /api/prebrief. Never
 *                                  mutated. Shared with the Member Board card.
 *   ["prebrief-actions", memberId] the clinician's decision per finding, layered
 *                                  on top of the AI output.
 *   ["prebrief-audit", memberId]   an append-only log: system suggestions +
 *                                  every clinician action. The Audit Trail reads it.
 *   ["prebrief-signoff", memberId] whether the pre-brief has been signed off.
 *
 * Keeping the AI output immutable and the clinician layer separate mirrors how
 * the real flow works: the model proposes, the clinician disposes, and the
 * disposal is fully logged.
 */

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPreBrief, prebriefQueryKey } from "@/lib/api";
import { auditKey, recordClinicianEvent, seedSystemEvent } from "@/lib/audit-cache";
import type { AuditEvent, Finding, FindingStatus, FinalisedPreBrief, PreBrief } from "@/lib/types";

export type ClinicianDecision = {
  status: Exclude<FindingStatus, "unverified">;
  clinicianEdit?: string;
};

type ActionMap = Record<string, ClinicianDecision>;

const keys = {
  actions: (id: string) => ["prebrief-actions", id] as const,
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
    queryKey: auditKey(memberId),
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

  const prebrief: PreBrief | undefined = prebriefQuery.data?.prebrief;
  const generatedAt = prebriefQuery.data?.generatedAt;

  // Record what the system proposed, once, as soon as the pre-brief arrives.
  useEffect(() => {
    if (!prebrief || !generatedAt) return;
    seedSystemEvent(qc, memberId, "Generated pre-brief", memberId, generatedAt);
    for (const f of prebrief.findings) {
      seedSystemEvent(qc, memberId, `Suggested finding: ${f.title}`, f.id, generatedAt);
    }
  }, [qc, memberId, prebrief, generatedAt]);

  const decide = useMutation({
    mutationFn: async (input: { findingId: string; decision: ClinicianDecision }) => input,
    onSuccess: ({ findingId, decision }) => {
      qc.setQueryData<ActionMap>(keys.actions(memberId), (prev = {}) => ({
        ...prev,
        [findingId]: decision,
      }));
      recordClinicianEvent(qc, memberId, decisionVerb(decision), findingId);
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
      recordClinicianEvent(qc, memberId, "Reopened finding", findingId);
    },
  });

  const signOff = useMutation({
    mutationFn: async () => true,
    onSuccess: () => {
      qc.setQueryData<boolean>(keys.signoff(memberId), true);
      recordClinicianEvent(qc, memberId, "Signed off pre-brief", memberId);
    },
  });

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
  const isSignedOff = signoffQuery.data;

  // The pre-brief as the clinician finalised it: only accepted/edited findings,
  // with the settled text in `rationale`. Non-null once signed off.
  const finalised: FinalisedPreBrief | null = useMemo(() => {
    if (!prebrief || !isSignedOff) return null;
    return {
      ...prebrief,
      findings: findings
        .filter((f) => f.status === "accepted" || f.status === "edited")
        .map((f) => ({
          id: f.id,
          title: f.title,
          rationale: f.displayText,
          riskTier: f.riskTier,
          provenance: f.provenance,
          status: f.status as "accepted" | "edited",
          ...(f.clinicianEdit ? { clinicianEdit: f.clinicianEdit } : {}),
        })),
    };
  }, [prebrief, isSignedOff, findings]);

  return {
    prebrief,
    generated: prebriefQuery.data?.generated ?? false,
    isLoading: prebriefQuery.isPending,
    isError: prebriefQuery.isError,
    error: prebriefQuery.error as Error | null,
    refetch: prebriefQuery.refetch,

    findings,
    finalised,
    audit: auditQuery.data,
    isSignedOff,
    unresolvedCount,
    resolvedCount: total - unresolvedCount,
    total,
    canSignOff: unresolvedCount === 0 && !isSignedOff,

    decide: (findingId: string, decision: ClinicianDecision) =>
      decide.mutate({ findingId, decision }),
    reopen: (findingId: string) => reopen.mutate(findingId),
    signOff: () => signOff.mutate(),
  };
}
