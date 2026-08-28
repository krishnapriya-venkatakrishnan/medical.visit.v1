"use client";

import { useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { usePreBrief } from "@/components/prebrief/use-prebrief";
import { useDebrief } from "./use-debrief";
import { DebriefDocument } from "./debrief-document";
import { DebriefEditor } from "./debrief-editor";
import { FlywheelDiff } from "./flywheel-diff";
import { AuditTable } from "@/components/audit/audit-table";
import { ErrorPanel } from "@/components/ui/error-panel";

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
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Link href="/" className="text-accent hover:underline">
            Board
          </Link>
          <span aria-hidden className="text-hairline">
            /
          </span>
          {backToPreBrief}
        </nav>

        <header className="mt-6">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Member debrief</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
            {member.displayName}
          </h1>
          {db.draft && !db.generated ? (
            <p className="mt-3 inline-block rounded-full bg-surface-sunken px-3 py-1 text-xs text-muted">
              Sample debrief · no API key configured
            </p>
          ) : null}
        </header>

        {!pb.isLoading && !pb.isSignedOff ? (
          <div className="mt-10 rounded-card border border-hairline bg-surface p-6 text-sm text-muted shadow-sm">
            This pre-brief has not been signed off yet. The debrief is drafted from the
            finalised pre-brief.
            <div className="mt-3">{backToPreBrief}</div>
          </div>
        ) : db.isLoading || pb.isLoading ? (
          <div className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-2" aria-hidden>
            <div className="h-96 rounded-card bg-surface-sunken" />
            <div className="h-64 rounded-card bg-surface-sunken" />
          </div>
        ) : db.isError ? (
          <div className="mt-10">
            <ErrorPanel
              title="The debrief could not be generated."
              message={db.error?.message}
              onRetry={() => db.refetch()}
            />
          </div>
        ) : db.current && db.draft ? (
          <div className="mt-10 grid items-start gap-x-8 gap-y-12 md:grid-cols-2">
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

            <div className="space-y-12">
              {db.hasEdits ? <FlywheelDiff draft={db.draft} current={db.current} /> : null}
              <AuditTable
                events={pb.audit}
                heading="Audit trail"
                caption="Every system suggestion, reconciler verdict, and clinician action."
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
