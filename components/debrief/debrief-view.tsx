"use client";

import { useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { usePreBrief } from "@/components/prebrief/use-prebrief";
import { useDebrief } from "./use-debrief";
import { DebriefDocument } from "./debrief-document";
import { DebriefEditor } from "./debrief-editor";
import { FlywheelDiff } from "./flywheel-diff";
import { AuditTrail } from "@/components/audit/audit-trail";

export function DebriefView({ member }: { member: Member }) {
  const pb = usePreBrief(member.id);
  const db = useDebrief(member.id, pb.finalised);
  const [editing, setEditing] = useState(false);

  const backToPreBrief = (
    <Link href={`/members/${member.id}`} className="text-sm text-accent hover:underline">
      Back to pre-brief
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      {backToPreBrief}

      <header className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Member debrief
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
          {member.displayName}
        </h1>
      </header>

      {!pb.isLoading && !pb.isSignedOff ? (
        <div className="mt-10 rounded-card border border-hairline bg-surface p-6 text-sm text-muted shadow-sm">
          This pre-brief has not been signed off yet. The debrief is drafted from the
          finalised pre-brief.
          <div className="mt-3">{backToPreBrief}</div>
        </div>
      ) : db.isLoading || pb.isLoading ? (
        <div className="mt-10 space-y-4" aria-hidden>
          <div className="h-5 w-48 rounded bg-surface-sunken" />
          <div className="h-64 w-full rounded-card bg-surface-sunken" />
        </div>
      ) : db.isError ? (
        <div className="mt-10 rounded-card border border-risk-priority-tint bg-risk-priority-tint p-6">
          <p className="text-sm font-medium text-risk-priority-fg">
            The debrief could not be generated.
          </p>
          <p className="mt-1 text-sm text-risk-priority-fg">{db.error?.message}</p>
          <button
            type="button"
            onClick={() => db.refetch()}
            className="mt-4 rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-bg"
          >
            Try again
          </button>
        </div>
      ) : db.current && db.draft ? (
        <div className="mt-8 space-y-12">
          {!db.generated ? (
            <p className="inline-block rounded-full bg-surface-sunken px-3 py-1 text-xs text-muted">
              Sample debrief · no API key configured
            </p>
          ) : null}

          <section aria-labelledby="draft-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="draft-heading" className="text-lg font-semibold text-ink">
                {db.isSent ? "Sent to member" : "Draft for the member"}
              </h2>
              {!db.isSent ? (
                <div className="flex gap-2">
                  {editing ? null : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="rounded-control border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40"
                    >
                      Edit draft
                    </button>
                  )}
                  {db.hasEdits && !editing ? (
                    <button
                      type="button"
                      onClick={() => db.revert()}
                      className="rounded-control px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
                    >
                      Revert to draft
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              {editing ? (
                <DebriefEditor
                  initial={db.current}
                  onSave={(edited) => {
                    db.saveEdits(edited);
                    setEditing(false);
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <DebriefDocument debrief={db.current} />
              )}
            </div>

            {!db.isSent && !editing ? (
              <button
                type="button"
                onClick={() => db.markSent()}
                className="mt-4 rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg"
              >
                Mark as sent
              </button>
            ) : null}
          </section>

          {db.hasEdits ? <FlywheelDiff draft={db.draft} current={db.current} /> : null}

          <AuditTrail events={pb.audit} />
        </div>
      ) : null}
    </main>
  );
}
