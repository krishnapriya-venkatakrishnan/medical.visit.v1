import Link from "next/link";
import { ErrorPanel } from "@/components/ui/error-panel";

export type RowStatus = "pending" | "error" | "ok";

interface Props {
  id: string;
  displayName: string;
  firstVisit: boolean;
  /** Readable date of the previous scan, or "-" for a first visit. */
  lastScanLabel: string;
  status: RowStatus;
  headline?: string;
  flagCount?: number;
}

/**
 * One member in the day's table. Presentational: the readiness headline and flag
 * count are fetched by the parent table (so it can sort by them) and passed in.
 * The whole row is the link into that member's pre-brief - a stretched `::after`
 * over a real <a>, so it stays keyboard- and screen-reader-navigable.
 */
export function MemberRow({
  id,
  displayName,
  firstVisit,
  lastScanLabel,
  status,
  headline,
  flagCount,
}: Props) {
  return (
    <tr className="group relative border-b border-hairline transition-colors last:border-0 hover:bg-accent-tint/40 focus-within:bg-accent-tint/40 motion-reduce:transition-none">
      <td className="px-5 py-4 align-top">
        <Link
          href={`/members/${id}`}
          aria-label={`Open pre-brief for ${displayName}`}
          className="font-medium text-ink after:absolute after:inset-0 group-hover:underline"
        >
          {displayName}
        </Link>
      </td>

      <td className="px-5 py-4 align-top">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            firstVisit ? "bg-accent-tint text-accent" : "bg-surface-sunken text-muted"
          }`}
        >
          {firstVisit ? "First visit" : "Returning"}
        </span>
      </td>

      <td className="px-5 py-4 align-top text-ink">{lastScanLabel}</td>

      <td className="px-5 py-4 align-top">
        {status === "pending" ? (
          <span aria-hidden className="block h-5 w-9 rounded bg-surface-sunken" />
        ) : status === "error" ? (
          <span className="text-ink">-</span>
        ) : (
          <span
            className={`tnum inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              (flagCount ?? 0) > 0
                ? "bg-risk-watch-tint text-risk-watch-fg"
                : "bg-surface-sunken text-muted"
            }`}
          >
            {flagCount ?? 0}
          </span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        {status === "pending" ? (
          <span aria-hidden className="block h-4 w-64 max-w-full rounded bg-surface-sunken" />
        ) : status === "error" ? (
          <ErrorPanel compact title="Pre-brief unavailable" />
        ) : (
          <span className="block text-sm leading-6 text-ink">
            <span className="sr-only">AI readiness summary: </span>
            {headline}
          </span>
        )}
      </td>
    </tr>
  );
}
