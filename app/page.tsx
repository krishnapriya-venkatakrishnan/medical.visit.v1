import type { Metadata } from "next";
import { getMembers, getLatestScan } from "@/lib/fixtures";
import { formatFullDate, formatTimeSince } from "@/lib/format";
import { MemberCard } from "@/components/member-board/member-card";

export const metadata: Metadata = {
  title: "Member board - Brief",
};

// The day's queue: render per request, not at build time.
export const dynamic = "force-dynamic";

export default function MemberBoard() {
  const now = new Date();
  const members = getMembers();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:py-20">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Today</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">
            {formatFullDate(now)}
          </h1>
          <span className="text-sm text-muted">
            <span className="tnum">{members.length}</span>{" "}
            {members.length === 1 ? "member" : "members"}
          </span>
        </div>
      </header>

      {members.length === 0 ? (
        <div className="rounded-card border border-hairline bg-surface p-10 text-center shadow-sm">
          <p className="text-ink">No members scheduled.</p>
          <p className="mt-1 text-sm text-muted">
            When today&rsquo;s visits are booked, they appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const latest = getLatestScan(member);
            return (
              <li key={member.id}>
                <MemberCard
                  id={member.id}
                  displayName={member.displayName}
                  firstVisit={member.firstVisit}
                  lastScanLabel={
                    member.firstVisit ? undefined : formatTimeSince(latest.date, now)
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
