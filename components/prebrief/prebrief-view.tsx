"use client";

import Link from "next/link";
import type { Member, PreBrief } from "@/lib/types";
import { usePreBrief } from "./use-prebrief";
import { DeltasSection } from "./deltas-section";
import { FindingsSection } from "./findings-section";
import { GuidanceSection } from "./guidance-section";
import { SignOffBar } from "./sign-off-bar";
import { ActivityList } from "./activity-list";

export function PreBriefView({ member, sample }: { member: Member; sample: PreBrief }) {
  const pb = usePreBrief(member.id, sample);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to board
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Pre-brief
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
          {member.displayName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {member.firstVisit ? "First visit" : "Returning"} ·{" "}
          <span className="tnum">{member.scans.length}</span>{" "}
          {member.scans.length === 1 ? "scan" : "scans"} on record · latest{" "}
          <span className="tnum">{member.scans[member.scans.length - 1].date}</span>
        </p>
      </header>

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
    </main>
  );
}
