"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchPreBrief, prebriefQueryKey } from "@/lib/api";

export interface MemberCardData {
  id: string;
  displayName: string;
  firstVisit: boolean;
  /** e.g. "3 weeks ago"; omitted for a first visit. */
  lastScanLabel?: string;
}

/**
 * One member in the clinician's day. The whole card links into that member's
 * pre-brief. The readiness headline and flag count come from POST /api/prebrief
 * via the same query key the Pre-Brief screen uses, so opening a member reuses
 * this fetch. Boldness is spent in one place: the periwinkle headline, which
 * marks the line as unverified AI.
 */
export function MemberCard({ id, displayName, firstVisit, lastScanLabel }: MemberCardData) {
  const query = useQuery({
    queryKey: prebriefQueryKey(id),
    queryFn: () => fetchPreBrief(id),
    staleTime: 5 * 60_000,
    select: (r) => ({ headline: r.prebrief.headline, flagCount: r.prebrief.findings.length }),
  });

  return (
    <Link
      href={`/members/${id}`}
      className="group flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-accent/40 hover:shadow-md motion-reduce:transition-none"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-medium text-ink">{displayName}</h2>
        <span className="text-sm text-muted">
          {firstVisit ? "First visit" : "Returning"}
        </span>
      </div>

      {!firstVisit && lastScanLabel ? (
        <p className="-mt-2 text-sm text-muted">Last scan {lastScanLabel}</p>
      ) : null}

      <div className="min-h-12">
        {query.isPending ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-3.5 w-full rounded bg-surface-sunken" />
            <div className="h-3.5 w-2/3 rounded bg-surface-sunken" />
          </div>
        ) : query.isError ? (
          <p className="text-sm text-muted">Pre-brief unavailable</p>
        ) : (
          <p className="flex gap-2 text-[0.95rem] leading-6 text-provisional-fg">
            <span
              aria-hidden
              className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-provisional"
            />
            <span>
              <span className="sr-only">AI readiness summary: </span>
              {query.data.headline}
            </span>
          </p>
        )}
      </div>

      <div className="mt-auto pt-1">
        {query.isSuccess && query.data.flagCount > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-risk-watch-tint px-3 py-1 text-xs font-medium text-risk-watch-fg">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-risk-watch-solid" />
            {query.data.flagCount} {query.data.flagCount === 1 ? "flag" : "flags"} to review
          </span>
        ) : query.isSuccess ? (
          <span className="text-xs text-muted">No flags to review</span>
        ) : null}
      </div>
    </Link>
  );
}
