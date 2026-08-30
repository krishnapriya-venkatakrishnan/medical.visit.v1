"use client";

import { useRef, useState } from "react";
import { useBriefPreBrief } from "./use-brief-prebrief";
import { DeltasSection } from "@/components/prebrief/deltas-section";
import { FindingsSection } from "@/components/prebrief/findings-section";
import { GuidanceSection } from "@/components/prebrief/guidance-section";
import { CaughtTray } from "@/components/prebrief/caught-tray";
import { DebriefDocument } from "@/components/debrief/debrief-document";
import { DebriefEditor } from "@/components/debrief/debrief-editor";
import { FlywheelDiff } from "@/components/debrief/flywheel-diff";
import { AiResponseModal } from "@/components/prebrief/ai-response-modal";
import { ReconcilerLegend } from "@/components/prebrief/reconciler-legend";
import { Code, withInlineCode } from "@/components/ui/code";
import { formatClockTime } from "@/lib/format";
import type { StepState } from "./use-brief-prebrief";

const STEP_MARK: Record<StepState, string> = {
  pending: "○",
  active: "◐",
  done: "●",
  failed: "✕",
};

const STEP_TEXT: Record<StepState, string> = {
  pending: "text-muted/60",
  active: "text-accent",
  done: "text-risk-good-fg",
  failed: "text-risk-priority-fg",
};

export function BriefView() {
  const brief = useBriefPreBrief();
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [editingDebrief, setEditingDebrief] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    setReadError(null);
    setEditingDebrief(false);
    brief.reset();
    if (!file) {
      setFileText("");
      setFileName(null);
      return;
    }
    try {
      setFileText(await file.text());
      setFileName(file.name);
    } catch {
      setFileText("");
      setFileName(null);
      setReadError("Could not read that file.");
    }
  }

  function run() {
    setReadError(null);
    setEditingDebrief(false);
    if (!fileText.trim()) {
      setReadError("Choose a scan .json file first.");
      return;
    }
    brief.run(fileText);
  }

  function clearAll() {
    setFileText("");
    setFileName(null);
    setReadError(null);
    setEditingDebrief(false);
    brief.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const statusLabel =
    brief.status === "idle"
      ? "Idle"
      : brief.status === "running"
        ? "Running"
        : brief.status === "done"
          ? "Done"
          : "Stopped";

  const statusTone =
    brief.status === "running"
      ? "text-accent"
      : brief.status === "done"
        ? "text-risk-good-fg"
        : brief.status === "error"
          ? "text-risk-priority-fg"
          : "text-muted";

  const r = brief.result;
  const groundedCount = r
    ? r.prebrief.findings.filter((f) => r.reconciliations[f.id]?.verdict === "grounded").length
    : 0;
  const flaggedCount = r ? r.prebrief.findings.length - groundedCount : 0;

  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-4xl px-6 py-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Brief</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
            Run a scan through the pipeline
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted">
            Upload one scan file. It is shape-checked against <Code>ScanSchema</Code>, sent to the
            model, and every claim is reconciled against that same scan. Nothing here is hardcoded:
            no sample record, no sample result. If it cannot run, the status below says why.
          </p>
        </header>

        {/* ---- Input ---- */}
        <section
          aria-labelledby="brief-input-heading"
          className="mt-8 rounded-card border border-hairline bg-surface p-6 shadow-sm"
        >
          <h2 id="brief-input-heading" className="text-lg font-semibold text-ink">
            Scan input
          </h2>

          <div className="mt-4">
            <label
              htmlFor="brief-file"
              className="text-xs font-medium uppercase tracking-widest text-muted"
            >
              Scan file (.json)
            </label>
            <input
              ref={fileInputRef}
              id="brief-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-control file:border file:border-hairline file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink hover:file:border-accent/40"
            />
            {fileName ? (
              <p className="mt-2 text-xs text-muted">
                Loaded <Code>{fileName}</Code>
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={brief.status === "running" || !fileText.trim()}
              className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {brief.status === "running" ? "Running..." : "Run pre-brief"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={brief.status === "running" || (!fileText && brief.status === "idle")}
              className="rounded-control px-3 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          {readError ? (
            <p role="alert" className="mt-3 text-sm text-risk-priority-fg">
              {readError}
            </p>
          ) : null}
        </section>

        {/* ---- Process status ---- */}
        <section
          aria-labelledby="brief-status-heading"
          aria-live="polite"
          className="mt-6 rounded-card border border-hairline bg-surface p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="brief-status-heading" className="text-lg font-semibold text-ink">
              Process status
            </h2>
            <span className={`text-sm font-medium ${statusTone}`}>{statusLabel}</span>
          </div>

          <ol className="mt-4 space-y-2">
            {brief.steps.map((step) => (
              <li key={step.label} className="flex gap-3 text-sm">
                <span aria-hidden className={`mt-0.5 ${STEP_TEXT[step.state]}`}>
                  {STEP_MARK[step.state]}
                </span>
                <span>
                  <span
                    className={step.state === "pending" ? "text-muted" : "font-medium text-ink"}
                  >
                    {step.label}
                  </span>
                  <span className="ml-2 text-xs text-muted">{withInlineCode(step.detail)}</span>
                </span>
              </li>
            ))}
          </ol>

          {brief.status === "idle" ? (
            <p className="mt-4 text-sm text-muted">Waiting for a scan. Nothing has been sent.</p>
          ) : null}

          {brief.status === "running" ? (
            <p className="mt-4 text-sm text-accent">
              Validating the shape, calling the model, then reconciling. One request.
            </p>
          ) : null}

          {brief.status === "done" && r ? (
            <p className="mt-4 text-sm text-risk-good-fg">
              Generated at <span className="tnum">{formatClockTime(r.generatedAt)}</span>.{" "}
              <span className="tnum">{r.prebrief.findings.length}</span>{" "}
              {r.prebrief.findings.length === 1 ? "finding" : "findings"} shown
              {flaggedCount > 0 ? (
                <>
                  {" "}
                  (<span className="tnum">{groundedCount}</span> grounded,{" "}
                  <span className="tnum">{flaggedCount}</span> flagged)
                </>
              ) : null}
              , <span className="tnum">{r.rejected.length}</span> caught by the reconciler.
            </p>
          ) : null}

          {brief.status === "error" ? (
            <div
              role="alert"
              className="mt-4 rounded-control border border-risk-priority-tint bg-risk-priority-tint p-3 text-sm text-risk-priority-fg"
            >
              <p className="font-medium">
                {brief.errorKind === "json" && "Not sent: the file is not valid JSON."}
                {brief.errorKind === "shape" && "Rejected at the input gate. Nothing was generated."}
                {brief.errorKind === "no-key" && "Cannot run live."}
                {brief.errorKind === "model" && "The model call failed. Nothing was generated."}
                {brief.errorKind === null && "Stopped."}
              </p>
              {brief.errorMessage ? <p className="mt-1">{brief.errorMessage}</p> : null}
            </div>
          ) : null}
        </section>

        {/* ---- Live result ---- */}
        {brief.status === "done" && r ? (
          <>
            <aside className="mt-8 rounded-card border border-provisional-border bg-linear-to-br from-provisional-tint to-surface p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-provisional-fg">
                AI readiness
              </p>
              <p className="mt-2 text-sm leading-relaxed text-provisional-fg">
                <span className="sr-only">AI readiness summary: </span>
                {r.prebrief.headline}
              </p>
              <button
                type="button"
                onClick={() => setShowAiResponse(true)}
                className="mt-3 rounded-control border border-provisional-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40"
              >
                View full AI response
              </button>
            </aside>

            {showAiResponse ? (
              <AiResponseModal raw={r.raw} onClose={() => setShowAiResponse(false)} />
            ) : null}

            <div className="mt-8">
              <ReconcilerLegend />
            </div>

            <div className="mt-8 space-y-12">
              <DeltasSection deltas={r.prebrief.deltas} firstVisit />
              <div className="space-y-8">
                <FindingsSection
                  findings={brief.findings}
                  locked={brief.isSignedOff}
                  decide={brief.decide}
                  reopen={brief.reopen}
                  subtitle="Risk-ranked. Accept, edit, or dismiss each one; the tier shown is code-derived, not the model's."
                />
                <CaughtTray rejected={r.rejected} />
              </div>
              <GuidanceSection
                talkingPoints={r.prebrief.talkingPoints}
                draftActionPlan={r.prebrief.draftActionPlan}
              />
            </div>

            {/* ---- Sign-off + debrief ---- */}
            <section
              aria-labelledby="brief-signoff-heading"
              className="mt-12 rounded-card border border-hairline bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="brief-signoff-heading" className="text-lg font-semibold text-ink">
                    Sign off
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {brief.isSignedOff ? (
                      <span className="font-medium text-risk-good-fg">
                        Brief signed off. Nothing here reaches a member without this step.
                      </span>
                    ) : brief.total === 0 ? (
                      "No findings to resolve. You can sign off."
                    ) : (
                      <>
                        <span className="tnum font-medium text-ink">
                          {brief.resolvedCount} of {brief.total}
                        </span>{" "}
                        findings resolved. Accept, edit, or dismiss every finding to sign off.
                      </>
                    )}
                  </p>
                </div>

                {!brief.isSignedOff ? (
                  <button
                    type="button"
                    onClick={brief.signOff}
                    disabled={!brief.canSignOff}
                    className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sign off brief
                  </button>
                ) : (
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex flex-wrap justify-end gap-2">
                      {!brief.debriefDraft ? (
                        <button
                          type="button"
                          onClick={brief.draftDebrief}
                          disabled={brief.debriefStatus === "running"}
                          className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {brief.debriefStatus === "running"
                            ? "Drafting..."
                            : "Draft member debrief"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        disabled={!brief.debriefDraft}
                        className="rounded-control border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Mark complete
                      </button>
                    </div>
                    {!brief.debriefDraft ? (
                      <p className="text-xs text-muted">
                        Draft and review the member debrief before marking the run complete.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {brief.debriefStatus === "error" ? (
                <div
                  role="alert"
                  className="mt-4 rounded-control border border-risk-priority-tint bg-risk-priority-tint p-3 text-sm text-risk-priority-fg"
                >
                  The debrief could not be drafted.
                  {brief.debriefError ? (
                    <span className="mt-1 block">{brief.debriefError}</span>
                  ) : null}
                </div>
              ) : null}

              {brief.debrief && brief.debriefDraft ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink">Member debrief draft</h3>
                      {!editingDebrief ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDebrief(true)}
                            className="rounded-control border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40"
                          >
                            Edit draft
                          </button>
                          {brief.hasDebriefEdits ? (
                            <button
                              type="button"
                              onClick={brief.revertDebrief}
                              className="rounded-control px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
                            >
                              Revert to draft
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Drafted from the signed-off brief, in the member&rsquo;s voice. Edit it as the
                      clinician would before it is sent.
                    </p>
                    <div className="mt-3">
                      {editingDebrief ? (
                        <DebriefEditor
                          initial={brief.debrief}
                          onSave={(edited) => {
                            brief.saveDebriefEdits(edited);
                            setEditingDebrief(false);
                          }}
                          onCancel={() => setEditingDebrief(false)}
                        />
                      ) : (
                        <DebriefDocument debrief={brief.debrief} />
                      )}
                    </div>
                  </div>

                  {brief.hasDebriefEdits && !editingDebrief ? (
                    <FlywheelDiff draft={brief.debriefDraft} current={brief.debrief} />
                  ) : null}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
