import type { Metadata } from "next";
import { getMembers, getPreviousScan } from "@/lib/fixtures";
import { formatFullDate } from "@/lib/format";
import { MemberTable, type MemberRowData } from "@/components/member-board/member-table";

export const metadata: Metadata = {
  title: "Member board - Brief",
};

// The day's queue: render per request, not at build time.
export const dynamic = "force-dynamic";

export default function MemberBoard() {
  const now = new Date();
  const members = getMembers();

  const rows: MemberRowData[] = members.map((member) => ({
    id: member.id,
    displayName: member.displayName,
    firstVisit: member.firstVisit,
    lastScanDate: member.firstVisit ? null : (getPreviousScan(member)?.date ?? null),
  }));

  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Today</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">
              {formatFullDate(now)}
            </h1>
            <span className="text-sm text-muted">
              <span className="tnum">{rows.length}</span>{" "}
              {rows.length === 1 ? "member" : "members"}
            </span>
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-card border border-hairline bg-surface p-10 text-center shadow-sm">
            <p className="text-ink">No members scheduled.</p>
            <p className="mt-1 text-sm text-muted">
              When today&rsquo;s visits are booked, they appear here.
            </p>
          </div>
        ) : (
          <MemberTable rows={rows} />
        )}
      </div>
    </main>
  );
}
