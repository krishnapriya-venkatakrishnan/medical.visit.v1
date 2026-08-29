"use client";

import type { ResolvedFinding, ClinicianDecision } from "./use-prebrief";
import { FindingCard } from "./finding-card";

interface Props {
  findings: ResolvedFinding[];
  locked: boolean;
  decide: (findingId: string, decision: ClinicianDecision) => void;
  reopen: (findingId: string) => void;
  /** Overrides the default sub-heading (e.g. on the Demo tab, where there is no sign-off). */
  subtitle?: string;
}

export function FindingsSection({ findings, locked, decide, reopen, subtitle }: Props) {
  return (
    <section aria-labelledby="findings-heading">
      <h2 id="findings-heading" className="text-lg font-semibold text-ink">
        Findings
      </h2>
      <p className="mt-1 text-sm text-muted">
        {subtitle ?? "Risk-ranked. Each must be accepted, edited, or dismissed before sign-off."}
      </p>

      {findings.length === 0 ? (
        <p className="mt-4 rounded-card border border-hairline bg-surface p-6 text-sm leading-relaxed text-muted shadow-sm">
          No findings in this pre-brief. The scan is broadly reassuring; see the
          changes and talking points below.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              locked={locked}
              onAccept={() => decide(finding.id, { status: "accepted" })}
              onEdit={(text) => decide(finding.id, { status: "edited", clinicianEdit: text })}
              onDismiss={() => decide(finding.id, { status: "dismissed" })}
              onReopen={() => reopen(finding.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
