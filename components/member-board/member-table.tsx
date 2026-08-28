"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchPreBrief, prebriefQueryKey, type PreBriefResponse } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { MemberRow, type RowStatus } from "./member-row";

export interface MemberRowData {
  id: string;
  displayName: string;
  firstVisit: boolean;
  /** The previous scan's date; null for a first visit. */
  lastScanDate: string | null;
}

type SortKey = "visit" | "flags";
type SortDir = "asc" | "desc";

export function MemberTable({ rows }: { rows: MemberRowData[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [since, setSince] = useState("");

  const results = useQueries({
    queries: rows.map((r) => ({
      queryKey: prebriefQueryKey(r.id),
      queryFn: () => fetchPreBrief(r.id),
      staleTime: 5 * 60_000,
      retry: false,
      select: (res: PreBriefResponse) => ({
        headline: res.prebrief.headline,
        flagCount: res.prebrief.findings.length,
      }),
    })),
  });

  const view = useMemo(() => {
    const merged = rows.map((r, i) => {
      const q = results[i];
      const status: RowStatus = q.isPending ? "pending" : q.isError ? "error" : "ok";
      return { ...r, status, headline: q.data?.headline, flagCount: q.data?.flagCount };
    });

    let list = since
      ? merged.filter((r) => r.lastScanDate !== null && r.lastScanDate >= since)
      : merged;

    if (sortKey) {
      const factor = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const cmp =
          sortKey === "visit"
            ? Number(b.firstVisit) - Number(a.firstVisit)
            : (a.flagCount ?? -1) - (b.flagCount ?? -1);
        return cmp * factor;
      });
    }
    return list;
  }, [rows, results, since, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const ariaSort = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <>
      <div className="mb-3 flex justify-end">
        <label className="flex items-center gap-2 text-xs text-muted">
          Last scan on or after
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="rounded-control border border-hairline bg-surface px-2.5 py-1 text-sm text-ink"
          />
          {since ? (
            <button
              type="button"
              onClick={() => setSince("")}
              className="font-medium text-accent hover:underline"
            >
              Clear
            </button>
          ) : null}
        </label>
      </div>

      <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-md">
        <table className="w-full min-w-184 border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <HeadCell>Member</HeadCell>
              <SortHeadCell
                label="Visit"
                onSort={() => toggleSort("visit")}
                ariaSort={ariaSort("visit")}
                active={sortKey === "visit"}
                dir={sortDir}
              />
              <HeadCell>Last scan</HeadCell>
              <SortHeadCell
                label="Flags"
                onSort={() => toggleSort("flags")}
                ariaSort={ariaSort("flags")}
                active={sortKey === "flags"}
                dir={sortDir}
              />
              <HeadCell>Readiness</HeadCell>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                  No members match this filter.
                </td>
              </tr>
            ) : (
              view.map((r) => (
                <MemberRow
                  key={r.id}
                  id={r.id}
                  displayName={r.displayName}
                  firstVisit={r.firstVisit}
                  lastScanLabel={r.lastScanDate ? formatDate(r.lastScanDate) : "-"}
                  status={r.status}
                  headline={r.headline}
                  flagCount={r.flagCount}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HeadCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-widest text-muted"
    >
      {children}
    </th>
  );
}

function SortHeadCell({
  label,
  onSort,
  ariaSort,
  active,
  dir,
}: {
  label: string;
  onSort: () => void;
  ariaSort: "ascending" | "descending" | "none";
  active: boolean;
  dir: SortDir;
}) {
  return (
    <th scope="col" aria-sort={ariaSort} className="px-5 py-3 text-left">
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted hover:text-ink"
      >
        {label}
        <span aria-hidden className={active ? "text-ink" : "text-hairline"}>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
