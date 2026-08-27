"use client";

import Link from "next/link";
import type { Member } from "@/lib/types";
import { usePreBrief } from "./use-prebrief";
import { DeltasSection } from "./deltas-section";
import { FindingsSection } from "./findings-section";
import { GuidanceSection } from "./guidance-section";
import { SignOffBar } from "./sign-off-bar";
import { ActivityList } from "./activity-list";
import { PreBriefSkeleton } from "./prebrief-skeleton";

export function PreBriefView({ member }: { member: Member }) {
  const pb = usePreBrief(member.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to board
      </Link>

      <header className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Pre-brief</p>
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

      {pb.isLoading ? (
        <PreBriefSkeleton />
      ) : pb.isError ? (
        <div className="mt-10 rounded-card border border-risk-priority-tint bg-risk-priority-tint p-6">
          <p className="text-sm font-medium text-risk-priority-fg">
            The pre-brief could not be generated.
          </p>
          <p className="mt-1 text-sm text-risk-priority-fg">
            {pb.error?.message ?? "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={() => pb.refetch()}
            className="mt-4 rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-bg"
          >
            Try again
          </button>
        </div>
      ) : pb.prebrief ? (
        <>
          <p className="mt-8 text-lg leading-7 text-provisional-fg">
            <span className="sr-only">AI readiness summary: </span>
            {pb.prebrief.headline}
          </p>

          <div className="mt-10 space-y-12">
            <DeltasSection deltas={pb.prebrief.deltas} firstVisit={member.firstVisit} />
            <FindingsSection
              findings={pb.findings}
              locked={pb.isSignedOff}
              decide={pb.decide}
              reopen={pb.reopen}
            />
            <GuidanceSection
              talkingPoints={pb.prebrief.talkingPoints}
              draftActionPlan={pb.prebrief.draftActionPlan}
            />
            <ActivityList events={pb.audit} />
          </div>

          <div className="mt-12">
            <SignOffBar
              total={pb.total}
              resolvedCount={pb.resolvedCount}
              canSignOff={pb.canSignOff}
              isSignedOff={pb.isSignedOff}
              onSignOff={pb.signOff}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
