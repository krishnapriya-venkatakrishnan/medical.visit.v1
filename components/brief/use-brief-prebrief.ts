"use client";

/**
 * Brief tab state: one uploaded scan in, one live reconciled pre-brief out, then
 * the same clinician-in-the-loop review as the fixture flow.
 *
 * There is NO cache key and NO fallback. The pre-brief is only ever what the
 * model produced for this exact input, run through the deterministic reconciler.
 * If it cannot run (bad JSON, wrong shape, no API key, model error) the hook
 * reports which step failed and why, and holds no result.
 *
 * Clinician decisions (accept / edit / dismiss) and sign-off live in local
 * component state: this tab is stateless and ephemeral, so a new run clears them.
 */

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ApiError,
  runBriefDebrief,
  runBriefPreBrief,
  type DebriefResponse,
  type PreBriefResponse,
} from "@/lib/api";
import type { ClinicianDecision, ResolvedFinding } from "@/components/prebrief/use-prebrief";
import type { Debrief, FinalisedPreBrief, Reconciliation, RiskTier } from "@/lib/types";

/** Thrown before anything reaches the server: the file content is not JSON. */
class NotJsonError extends Error {
  constructor() {
    super("That is not valid JSON. Choose a scan .json file.");
    this.name = "NotJsonError";
  }
}

export type StepState = "pending" | "active" | "done" | "failed";

export interface ProcessStep {
  label: string;
  detail: string;
  state: StepState;
}

export type ProcessStatus = "idle" | "running" | "done" | "error";
export type DebriefStatus = "idle" | "running" | "done" | "error";

type DecisionMap = Record<string, ClinicianDecision>;

const TIER_ORDER: Record<RiskTier, number> = { priority: 0, elevated: 1, watch: 2, good: 3 };

function resolveFindings(response: PreBriefResponse, decisions: DecisionMap): ResolvedFinding[] {
  return [...response.prebrief.findings]
    .map((f): ResolvedFinding => {
      const rec = response.reconciliations[f.id];
      const reconciliation: Reconciliation =
        rec && "derivedTier" in rec
          ? rec
          : { findingId: f.id, verdict: "grounded", derivedTier: f.proposedTier, checks: [] };
      const decision = decisions[f.id];
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
}

export function useBriefPreBrief() {
  const mutation = useMutation<PreBriefResponse, Error, string>({
    mutationFn: (rawText: string) => {
      let scan: unknown;
      try {
        scan = JSON.parse(rawText);
      } catch {
        throw new NotJsonError();
      }
      return runBriefPreBrief(scan);
    },
  });

  const debriefMutation = useMutation<DebriefResponse, Error, FinalisedPreBrief>({
    mutationFn: (finalised) => runBriefDebrief(finalised),
  });

  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [signedOff, setSignedOff] = useState(false);
  const [debriefEdits, setDebriefEdits] = useState<Debrief | null>(null);

  const result = mutation.data;

  // A fresh run clears the whole review before it starts (see `run` below), so a
  // completed pre-brief always begins with every finding unresolved again.
  const clearReview = () => {
    setDecisions({});
    setSignedOff(false);
    setDebriefEdits(null);
    debriefMutation.reset();
  };

  const status: ProcessStatus = mutation.isPending
    ? "running"
    : mutation.isSuccess
      ? "done"
      : mutation.isError
        ? "error"
        : "idle";

  const err = mutation.error;
  const apiStatus = err instanceof ApiError ? err.status : null;
  const isJsonError = err instanceof NotJsonError;
  const isShapeError = apiStatus === 400;
  const isNoKey = apiStatus === 503;
  const isModelError = apiStatus === 429 || apiStatus === 502;

  const steps: ProcessStep[] = useMemo(() => {
    const running = status === "running";
    const succeeded = status === "done";

    // Steps 2-4 all run server-side inside one request, so while it is in flight
    // they show together as "active"; a failure pins the step it belongs to.
    const step1: StepState = isJsonError ? "failed" : status === "idle" ? "pending" : "done";

    const step2: StepState = isShapeError
      ? "failed"
      : succeeded || isNoKey || isModelError
        ? "done"
        : running
          ? "active"
          : "pending";

    const step3: StepState = isNoKey || isModelError
      ? "failed"
      : succeeded
        ? "done"
        : running
          ? "active"
          : "pending";

    const step4: StepState = succeeded ? "done" : running ? "active" : "pending";

    return [
      { label: "Input parsed", detail: "The uploaded file is valid JSON.", state: step1 },
      {
        label: "Shape validated",
        detail: "The input is a well-formed `Scan` (`ScanSchema`). Rejected here on a 400.",
        state: step2,
      },
      {
        label: "Pre-brief generated",
        detail: "The model drafts findings and prose from the scan.",
        state: step3,
      },
      {
        label: "Claims reconciled",
        detail: "Every finding is tied back to the uploaded scan by `lib/reconcile.ts`.",
        state: step4,
      },
    ];
  }, [status, isJsonError, isShapeError, isNoKey, isModelError]);

  const errorKind = isJsonError
    ? "json"
    : isShapeError
      ? "shape"
      : isNoKey
        ? "no-key"
        : isModelError
          ? "model"
          : null;

  const findings = useMemo(
    () => (result ? resolveFindings(result, decisions) : []),
    [result, decisions],
  );

  const total = findings.length;
  const unresolvedCount = findings.filter((f) => f.status === "unverified").length;
  const resolvedCount = total - unresolvedCount;
  const isSignedOff = signedOff;
  const canSignOff = status === "done" && unresolvedCount === 0 && !signedOff;

  const decide = (findingId: string, decision: ClinicianDecision) =>
    setDecisions((prev) => ({ ...prev, [findingId]: decision }));

  const reopen = (findingId: string) =>
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[findingId];
      return next;
    });

  const signOff = () => {
    if (canSignOff) setSignedOff(true);
  };

  // The pre-brief as the clinician finalised it: accepted / edited findings only,
  // settled text in `rationale`. Non-null once signed off.
  const finalised: FinalisedPreBrief | null = useMemo(() => {
    if (!result || !signedOff) return null;
    return {
      ...result.prebrief,
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
  }, [result, signedOff, findings]);

  const debriefStatus: DebriefStatus = debriefMutation.isPending
    ? "running"
    : debriefMutation.isSuccess
      ? "done"
      : debriefMutation.isError
        ? "error"
        : "idle";

  return {
    status,
    steps,
    errorKind,
    errorMessage: err?.message ?? null,
    result,

    findings,
    total,
    resolvedCount,
    unresolvedCount,
    isSignedOff,
    canSignOff,

    decide,
    reopen,
    signOff,

    // The AI draft, the clinician's edited version, and the current (edits or
    // draft) one, so the view can show an editor and the flywheel diff.
    debriefDraft: debriefMutation.data?.debrief,
    debrief: debriefEdits ?? debriefMutation.data?.debrief,
    hasDebriefEdits: debriefEdits !== null,
    debriefStatus,
    debriefError: debriefMutation.error?.message ?? null,
    draftDebrief: () => {
      if (finalised) debriefMutation.mutate(finalised);
    },
    saveDebriefEdits: (edited: Debrief) => setDebriefEdits(edited),
    revertDebrief: () => setDebriefEdits(null),

    run: (rawText: string) => {
      clearReview();
      mutation.mutate(rawText);
    },
    reset: () => {
      mutation.reset();
      clearReview();
    },
  };
}
