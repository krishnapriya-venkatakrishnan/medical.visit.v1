"use client";

import { useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { usePreBrief } from "./use-prebrief";
import { AiResponseModal } from "./ai-response-modal";
import { DeltasSection } from "./deltas-section";
import { FindingsSection } from "./findings-section";
import { GuidanceSection } from "./guidance-section";
import { SignOffBar } from "./sign-off-bar";
import { AuditTable } from "@/components/audit/audit-table";
import { CaughtTray } from "./caught-tray";
import { ReconcilerLegend } from "./reconciler-legend";
import { PreBriefSkeleton } from "./prebrief-skeleton";
import { ErrorPanel } from "@/components/ui/error-panel";

export function PreBriefView({ member }: { member: Member }) {
  const pb = usePreBrief(member.id);
  const [showAiResponse, setShowAiResponse] = useState(false);

  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <Link href="/" className="text-sm text-accent hover:underline">
          Back to board
        </Link>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <header>
            <p className="text-xs font-medium uppercase tracking-widest text-muted">Pre-brief</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
              {member.displayName}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {member.firstVisit ? "First visit" : "Returning"} ·{" "}
              <span className="tnum">{member.scans.length}</span>{" "}
              {member.scans.length === 1 ? "scan" : "scans"} on record · latest{" "}
              <span className="tnum">{member.scans[member.scans.length - 1].date}</span>
            </p>
            {pb.prebrief && !pb.generated ? (
              <p className="mt-3 inline-block rounded-full bg-surface-sunken px-3 py-1 text-xs text-muted">
                Sample pre-brief · no API key configured
              </p>
            ) : null}
          </header>

          {pb.prebrief ? (
            <aside className="w-full shrink-0 rounded-card border border-provisional-border bg-linear-to-br from-provisional-tint to-surface p-5 shadow-sm md:max-w-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-provisional-fg">
                AI readiness
              </p>
              <p className="mt-2 text-sm leading-relaxed text-provisional-fg">
                <span className="sr-only">AI readiness summary: </span>
                {pb.prebrief.headline}
              </p>
              {pb.raw ? (
                <button
                  type="button"
                  onClick={() => setShowAiResponse(true)}
                  className="mt-3 rounded-control border border-provisional-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40"
                >
                  View full AI response
                </button>
              ) : null}
            </aside>
          ) : null}
        </div>

        {showAiResponse && pb.raw ? (
          <AiResponseModal raw={pb.raw} onClose={() => setShowAiResponse(false)} />
        ) : null}

        {pb.isLoading ? (
          <PreBriefSkeleton />
        ) : pb.isError ? (
          <div className="mt-10">
            <ErrorPanel
              title="The pre-brief could not be generated."
              message={pb.error?.message}
              onRetry={() => pb.refetch()}
            />
          </div>
        ) : pb.prebrief ? (
          <>
            <div className="mt-10">
              <ReconcilerLegend />
            </div>

            <div className="mt-10 grid items-start gap-x-8 gap-y-12 md:grid-cols-2">
              <DeltasSection deltas={pb.prebrief.deltas} firstVisit={member.firstVisit} />

              <div className="space-y-8">
                <FindingsSection
                  findings={pb.findings}
                  locked={pb.isSignedOff}
                  decide={pb.decide}
                  reopen={pb.reopen}
                />
                <CaughtTray rejected={pb.rejected} />
              </div>

              <GuidanceSection
                talkingPoints={pb.prebrief.talkingPoints}
                draftActionPlan={pb.prebrief.draftActionPlan}
              />

              <AuditTable events={pb.audit} />
            </div>

            <div className="mt-12">
              <SignOffBar
                memberId={member.id}
                total={pb.total}
                resolvedCount={pb.resolvedCount}
                canSignOff={pb.canSignOff}
                isSignedOff={pb.isSignedOff}
                onSignOff={pb.signOff}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
