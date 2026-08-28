import type { RiskTier } from "@/lib/types";

const LABEL: Record<RiskTier, string> = {
  priority: "Priority",
  elevated: "Elevated",
  watch: "Watch",
  good: "Good",
};

const STYLE: Record<RiskTier, string> = {
  priority: "bg-risk-priority-tint text-risk-priority-fg",
  elevated: "bg-risk-elevated-tint text-risk-elevated-fg",
  watch: "bg-risk-watch-tint text-risk-watch-fg",
  good: "bg-risk-good-tint text-risk-good-fg",
};

const DOT: Record<RiskTier, string> = {
  priority: "bg-risk-priority-solid",
  elevated: "bg-risk-elevated-solid",
  watch: "bg-risk-watch-solid",
  good: "bg-risk-good-solid",
};

/**
 * The displayed tier is always the reconciler's `derivedTier`, computed from the
 * record, never the model's `proposedTier`.
 */
export function RiskBadge({ tier }: { tier: RiskTier }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[tier]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[tier]}`} />
      {LABEL[tier]}
    </span>
  );
}
