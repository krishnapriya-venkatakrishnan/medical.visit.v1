"use client";

/**
 * Clinician-in-the-loop state for one pre-brief, held in the TanStack Query cache.
 *
 *   ["prebrief", memberId]         the reconciled output from POST /api/prebrief
 *                                  (findings + per-finding Reconciliation + the
 *                                  rejected tray). Never mutated. Shared with the
 *                                  Member Board card.
 *   ["prebrief-actions", memberId] the clinician's decision per finding, layered
 *                                  on top.
 *   ["prebrief-audit", memberId]   an append-only log: system suggestions,
 *                                  reconciler verdicts, every clinician action.
 *   ["prebrief-signoff", memberId] whether the pre-brief has been signed off.
 *
 * The model proposes, the reconciler grounds, the clinician disposes, and every
 * step is logged.
 */

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPreBrief, prebriefQueryKey, type RejectedItem } from "@/lib/api";
import { auditKey, recordClinicianEvent, seedSystemEvent } from "@/lib/audit-cache";
import type {
  AuditEvent,
  Finding,
  FindingStatus,
  FinalisedPreBrief,
  PreBrief,
  Reconciliation,
  RiskTier,
} from "@/lib/types";

export type ClinicianDecision = {
  status: Exclude<FindingStatus, "unverified">;
  clinicianEdit?: string;
};

type ActionMap = Record<string, ClinicianDecision>;

const keys = {
  actions: (id: string) => ["prebrief-actions", id] as const,
  signoff: (id: string) => ["prebrief-signoff", id] as const,
};

const TIER_ORDER: Record<RiskTier, number> = { priority: 0, elevated: 1, watch: 2, good: 3 };

function decisionOutcome(d: ClinicianDecision): string {
  return d.status === "accepted" ? "Accepted" : d.status === "edited" ? "Edited" : "Dismissed";
}

export interface ResolvedFinding extends Finding {
  /** The text to show: the clinician's edit when present, otherwise the rationale. */
  displayText: string;
  /** The reconciler's verdict for this finding. `derivedTier` is what displays. */
  reconciliation: Reconciliation;
}

const EMPTY_FINDINGS: ResolvedFinding[] = [];
const EMPTY_REJECTED: RejectedItem[] = [];

export function usePreBrief(memberId: string) {
  const qc = useQueryClient();

  const prebriefQuery = useQuery({
    queryKey: prebriefQueryKey(memberId),
    queryFn: () => fetchPreBrief(memberId),
    staleTime: 5 * 60_000,
    // Our endpoint's failures are deterministic (bad key, invalid output);
    // retrying just hammers it. The user retries explicitly.
    retry: false,
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

  const response = prebriefQuery.data;
  const prebrief: PreBrief | undefined = response?.prebrief;
  const generatedAt = response?.generatedAt;

  const titleOf = (id: string) =>
    prebrief?.findings.find((f) => f.id === id)?.title ??
    response?.rejected.find((r) => r.id === id)?.title ??
    id;

  // Record what the system proposed and how the reconciler ruled, once.
  useEffect(() => {
    if (!response || !prebrief || !generatedAt) return;
    seedSystemEvent(qc, memberId, "Generated pre-brief", memberId, generatedAt, {
      finding: "Pre-brief",
      outcome: "Generated",
    });
    for (const f of prebrief.findings) {
      const verdict = response.reconciliations[f.id]?.verdict ?? "grounded";
      seedSystemEvent(qc, memberId, `Reconciler: ${verdict} - ${f.title}`, f.id, generatedAt, {
        finding: f.title,
        verdict,
      });
    }
    for (const r of response.rejected) {
      seedSystemEvent(
        qc,
        memberId,
        `Reconciler: rejected - ${r.title} (${r.failedCheck?.name ?? "check failed"})`,
        r.id,
        generatedAt,
        { finding: r.title, verdict: "rejected" },
      );
    }
  }, [qc, memberId, response, prebrief, generatedAt]);

  const decide = useMutation({
    mutationFn: async (input: { findingId: string; decision: ClinicianDecision }) => input,
    onSuccess: ({ findingId, decision }) => {
      qc.setQueryData<ActionMap>(keys.actions(memberId), (prev = {}) => ({
        ...prev,
        [findingId]: decision,
      }));
      const title = titleOf(findingId);
      const outcome = decisionOutcome(decision);
      recordClinicianEvent(qc, memberId, `${outcome}: ${title}`, findingId, {
        finding: title,
        outcome,
      });
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
      const title = titleOf(findingId);
      recordClinicianEvent(qc, memberId, `Reopened: ${title}`, findingId, {
        finding: title,
        outcome: "Reopened",
      });
    },
  });

  const signOff = useMutation({
    mutationFn: async () => true,
    onSuccess: () => {
      qc.setQueryData<boolean>(keys.signoff(memberId), true);
      recordClinicianEvent(qc, memberId, "Signed off pre-brief", memberId, {
        finding: "Pre-brief",
        outcome: "Signed off",
      });
    },
  });

  const actions = actionsQuery.data;

  const findings: ResolvedFinding[] = useMemo(() => {
    if (!response || !prebrief) return EMPTY_FINDINGS;
    return [...prebrief.findings]
      .map((f): ResolvedFinding => {
        const rec = response.reconciliations[f.id];
        const reconciliation: Reconciliation =
          rec && "derivedTier" in rec
            ? rec
            : { findingId: f.id, verdict: "grounded", derivedTier: f.proposedTier, checks: [] };
        const decision = actions[f.id];
        return {
          ...f,
          status: decision?.status ?? "unverified",
          clinicianEdit: decision?.clinicianEdit,
          displayText: decision?.clinicianEdit ?? f.rationale,
          reconciliation,
        };
      })
      .sort(
        (a, b) => TIER_ORDER[a.reconciliation.derivedTier] - TIER_ORDER[b.reconciliation.derivedTier],
      );
  }, [response, prebrief, actions]);

  const unresolvedCount = findings.filter((f) => f.status === "unverified").length;
  const total = findings.length;
  const isSignedOff = signoffQuery.data;

  // The pre-brief as the clinician finalised it: only accepted/edited findings
  // (all of which passed reconciliation to be shown at all), settled text in
  // `rationale`. Non-null once signed off.
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
          claim: f.claim,
          proposedTier: f.proposedTier,
          provenance: f.provenance,
          status: f.status as "accepted" | "edited",
          ...(f.clinicianEdit ? { clinicianEdit: f.clinicianEdit } : {}),
        })),
    };
  }, [prebrief, isSignedOff, findings]);

  return {
    prebrief,
    raw: response?.raw ?? null,
    rejected: response?.rejected ?? EMPTY_REJECTED,
    generated: response?.generated ?? false,
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
