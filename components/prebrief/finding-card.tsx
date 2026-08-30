"use client";

import { useState } from "react";
import type { RiskTier } from "@/lib/types";
import type { ResolvedFinding } from "./use-prebrief";
import { RiskBadge } from "./risk-badge";
import { ProvenanceDetails } from "./provenance-details";

// A coloured left stripe per risk tier, so findings are told apart at a glance.
const TIER_BAR: Record<RiskTier, string> = {
  priority: "bg-risk-priority-solid",
  elevated: "bg-risk-elevated-solid",
  watch: "bg-risk-watch-solid",
  good: "bg-risk-good-solid",
};

interface Props {
  finding: ResolvedFinding;
  locked: boolean;
  onAccept: () => void;
  onEdit: (text: string) => void;
  onDismiss: () => void;
  onReopen: () => void;
}

export function FindingCard({ finding, locked, onAccept, onEdit, onDismiss, onReopen }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(finding.displayText);

  const isUnverified = finding.status === "unverified";
  const isDismissed = finding.status === "dismissed";
  const { verdict, derivedTier } = finding.reconciliation;
  const failedCheck = finding.reconciliation.checks.find((c) => !c.passed);

  const shell = isUnverified
    ? "border-provisional-border bg-provisional-tint"
    : "border-hairline bg-surface";

  // The periwinkle -> ink resolve is animated: when a finding is accepted or
  // edited, colour eases from the provisional state to confirmed ink rather
  // than snapping.
  const transition =
    "transition-[background-color,border-color,color,opacity] duration-500 ease-out motion-reduce:transition-none";

  return (
    <article
      className={`relative overflow-hidden rounded-card border p-6 shadow-sm ${transition} ${shell} ${
        isDismissed ? "opacity-70" : ""
      }`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TIER_BAR[derivedTier]}`} />

      <div className="flex items-start justify-between gap-3">
        <h3
          className={`text-base font-semibold ${transition} ${
            isUnverified ? "text-provisional-fg" : "text-ink"
          } ${isDismissed ? "line-through" : ""}`}
        >
          {finding.title}
        </h3>
        <RiskBadge tier={derivedTier} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {isUnverified ? (
          <span className="inline-flex items-center gap-1 font-medium text-provisional-fg">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-provisional" />
            AI · unverified
          </span>
        ) : (
          <span className="text-muted">
            {finding.status === "accepted" && "Accepted by clinician"}
            {finding.status === "edited" && "Edited by clinician"}
            {finding.status === "dismissed" && "Dismissed by clinician"}
          </span>
        )}

        {verdict === "grounded" ? (
          <span className="inline-flex items-center gap-1 font-medium text-risk-good-fg">
            <span aria-hidden>✓</span> reconciled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-medium text-risk-elevated-fg">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-risk-elevated-solid" />
            review carefully
          </span>
        )}
      </div>

      {verdict === "flagged" && failedCheck ? (
        <p className="mt-3 rounded-control bg-risk-elevated-tint px-3 py-2 text-xs leading-5 text-risk-elevated-fg">
          Reconciler: {failedCheck.detail}
        </p>
      ) : null}

      {editing ? (
        <div className="mt-4">
          <label className="sr-only" htmlFor={`edit-${finding.id}`}>
            Edit finding {finding.title}
          </label>
          <textarea
            id={`edit-${finding.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full rounded-control border border-hairline bg-surface p-3 text-sm leading-6 text-ink"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onEdit(draft.trim() || finding.rationale);
                setEditing(false);
              }}
              className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-bg"
            >
              Save edit
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(finding.displayText);
                setEditing(false);
              }}
              className="rounded-control px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`mt-4 text-sm leading-relaxed ${transition} ${
            isUnverified ? "text-provisional-fg" : "text-ink"
          }`}
        >
          {finding.displayText}
        </p>
      )}

      <div className="mt-4">
        <ProvenanceDetails
          refs={finding.provenance}
          tone={isUnverified ? "provisional" : "default"}
        />
      </div>

      {!locked && !editing && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
          {isUnverified ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-bg"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(finding.rationale);
                  setEditing(true);
                }}
                className="rounded-control border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-control px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                Dismiss
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onReopen}
              className="rounded-control px-3 py-1.5 text-xs font-medium text-accent hover:underline"
            >
              Reopen
            </button>
          )}
        </div>
      )}
    </article>
  );
}
