import Link from "next/link";

export interface MemberCardData {
  id: string;
  displayName: string;
  firstVisit: boolean;
  /** e.g. "3 weeks ago"; omitted for a first visit. */
  lastScanLabel?: string;
  /** Machine-drafted, rendered as provisional (periwinkle). */
  readinessHeadline: string;
  flagCount: number;
}

/**
 * One member in the clinician's day. The whole card is the link into that
 * member's pre-brief. Boldness is spent in one place: the periwinkle readiness
 * headline, which marks the line as unverified AI. Everything else stays quiet.
 */
export function MemberCard({
  id,
  displayName,
  firstVisit,
  lastScanLabel,
  readinessHeadline,
  flagCount,
}: MemberCardData) {
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

      <p className="flex gap-2 text-[0.95rem] leading-6 text-provisional-fg">
        <span
          aria-hidden
          className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-provisional"
        />
        <span>
          <span className="sr-only">AI readiness summary: </span>
          {readinessHeadline}
        </span>
      </p>

      <div className="mt-auto pt-1">
        {flagCount > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-risk-watch-tint px-3 py-1 text-xs font-medium text-risk-watch-fg">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-risk-watch-solid" />
            {flagCount} {flagCount === 1 ? "flag" : "flags"} to review
          </span>
        ) : (
          <span className="text-xs text-muted">No flags to review</span>
        )}
      </div>
    </Link>
  );
}
