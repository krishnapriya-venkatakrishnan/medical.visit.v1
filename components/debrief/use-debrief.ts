"use client";

/**
 * State for the member debrief, in the TanStack Query cache.
 *
 *   ["debrief", memberId]        the AI draft from POST /api/debrief. Immutable.
 *   ["debrief-edits", memberId]  the clinician's edited version, or null.
 *   ["debrief-sent", memberId]   whether it has been marked as sent.
 *
 * The diff between the draft and the edited version is the flywheel teaching
 * signal (computed in the view). Clinician actions are written to the shared
 * audit log so the Audit Trail shows the whole story.
 */

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { debriefQueryKey, fetchDebrief } from "@/lib/api";
import { recordClinicianEvent, seedSystemEvent } from "@/lib/audit-cache";
import type { Debrief, FinalisedPreBrief } from "@/lib/types";

const keys = {
  edits: (id: string) => ["debrief-edits", id] as const,
  sent: (id: string) => ["debrief-sent", id] as const,
};

export function useDebrief(memberId: string, finalised: FinalisedPreBrief | null) {
  const qc = useQueryClient();

  const draftQuery = useQuery({
    queryKey: debriefQueryKey(memberId),
    queryFn: () => fetchDebrief(finalised as FinalisedPreBrief),
    enabled: finalised !== null,
    staleTime: Infinity,
    retry: false,
  });

  const editsQuery = useQuery({
    queryKey: keys.edits(memberId),
    queryFn: async (): Promise<Debrief | null> => null,
    initialData: null,
    staleTime: Infinity,
  });

  const sentQuery = useQuery({
    queryKey: keys.sent(memberId),
    queryFn: async (): Promise<boolean> => false,
    initialData: false,
    staleTime: Infinity,
  });

  const draft = draftQuery.data?.debrief;
  const generatedAt = draftQuery.data?.generatedAt;

  useEffect(() => {
    if (!draft || !generatedAt) return;
    seedSystemEvent(qc, memberId, "Drafted member debrief", memberId, generatedAt, {
      finding: "Debrief",
      outcome: "Drafted",
    });
  }, [qc, memberId, draft, generatedAt]);

  const saveEdits = useMutation({
    mutationFn: async (edited: Debrief) => edited,
    onSuccess: (edited) => {
      qc.setQueryData<Debrief | null>(keys.edits(memberId), edited);
      recordClinicianEvent(qc, memberId, "Edited member debrief", memberId, {
        finding: "Debrief",
        outcome: "Edited",
      });
    },
  });

  const revert = useMutation({
    mutationFn: async () => null,
    onSuccess: () => {
      qc.setQueryData<Debrief | null>(keys.edits(memberId), null);
      recordClinicianEvent(qc, memberId, "Reverted debrief to the draft", memberId, {
        finding: "Debrief",
        outcome: "Reverted",
      });
    },
  });

  const markSent = useMutation({
    mutationFn: async () => true,
    onSuccess: () => {
      qc.setQueryData<boolean>(keys.sent(memberId), true);
      recordClinicianEvent(qc, memberId, "Sent debrief to member", memberId, {
        finding: "Debrief",
        outcome: "Sent",
      });
    },
  });

  const edits = editsQuery.data;

  return {
    draft,
    current: edits ?? draft,
    hasEdits: edits !== null,
    generated: draftQuery.data?.generated ?? false,
    isLoading: draftQuery.isPending && finalised !== null,
    isError: draftQuery.isError,
    error: draftQuery.error as Error | null,
    refetch: draftQuery.refetch,
    isSent: sentQuery.data,

    saveEdits: (edited: Debrief) => saveEdits.mutate(edited),
    revert: () => revert.mutate(),
    markSent: () => markSent.mutate(),
  };
}
