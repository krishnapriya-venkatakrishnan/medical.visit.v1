"use client";

import Link from "next/link";

/**
 * The sign-off gate. The pre-brief cannot be finalised until every finding is
 * resolved. This bar is the product's spine made visible: it always shows how
 * many findings remain, and the button is inert until none do. Once signed off
 * it points to the member debrief.
 */
export function SignOffBar({
  memberId,
  total,
  resolvedCount,
  canSignOff,
  isSignedOff,
  onSignOff,
}: {
  memberId: string;
  total: number;
  resolvedCount: number;
  canSignOff: boolean;
  isSignedOff: boolean;
  onSignOff: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 border-t border-hairline bg-bg/90 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="text-sm">
          {isSignedOff ? (
            <span className="font-medium text-risk-good-fg">Pre-brief signed off</span>
          ) : total === 0 ? (
            <span className="text-muted">No findings to resolve</span>
          ) : (
            <span className="text-muted">
              <span className="tnum font-medium text-ink">
                {resolvedCount} of {total}
              </span>{" "}
              findings resolved
            </span>
          )}
        </div>

        {isSignedOff ? (
          <Link
            href={`/members/${memberId}/debrief`}
            className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg"
          >
            Draft member debrief
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSignOff}
            disabled={!canSignOff}
            className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sign off pre-brief
          </button>
        )}
      </div>
    </div>
  );
}
