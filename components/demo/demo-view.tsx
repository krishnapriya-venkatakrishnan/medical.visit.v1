"use client";

import { useRef, useState } from "react";
import { useDemoPreBrief } from "./use-demo-prebrief";
import { DeltasSection } from "@/components/prebrief/deltas-section";
import { FindingsSection } from "@/components/prebrief/findings-section";
import { GuidanceSection } from "@/components/prebrief/guidance-section";
import { CaughtTray } from "@/components/prebrief/caught-tray";
import { DebriefDocument } from "@/components/debrief/debrief-document";
import { DebriefEditor } from "@/components/debrief/debrief-editor";
import { FlywheelDiff } from "@/components/debrief/flywheel-diff";
import { AiResponseModal } from "@/components/prebrief/ai-response-modal";
import { formatClockTime } from "@/lib/format";
import type { StepState } from "./use-demo-prebrief";

const SAMPLES = [
  { name: "demo-scan-clean", label: "Clean" },
  { name: "demo-scan-borderline", label: "Borderline" },
  { name: "demo-scan-first-visit-bp", label: "First visit, high BP" },
  { name: "demo-scan-malformed", label: "Malformed (shows the reject)" },
] as const;

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

export function DemoView() {
  const demo = useDemoPreBrief();
  const [text, setText] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [editingDebrief, setEditingDebrief] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadSample(name: string) {
    setReadError(null);
    demo.reset();
    try {
      const res = await fetch(`/sample-scans/${name}.json`);
      if (!res.ok) throw new Error(`Could not load the sample (${res.status}).`);
      setText(await res.text());
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "Could not load the sample.");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReadError(null);
    demo.reset();
    try {
      setText(await file.text());
    } catch {
      setReadError("Could not read that file.");
    }
  }

  function run() {
    setReadError(null);
    setEditingDebrief(false);
    if (!text.trim()) {
      setReadError("Paste a scan, choose a .json file, or load a sample first.");
      return;
    }
    demo.run(text);
  }

  const statusLabel =
    demo.status === "idle"
      ? "Idle"
      : demo.status === "running"
        ? "Running"
        : demo.status === "done"
          ? "Done"
          : "Stopped";

  const statusTone =
    demo.status === "running"
      ? "text-accent"
      : demo.status === "done"
        ? "text-risk-good-fg"
        : demo.status === "error"
          ? "text-risk-priority-fg"
          : "text-muted";

  const r = demo.result;
  const groundedCount = r
    ? r.prebrief.findings.filter((f) => r.reconciliations[f.id]?.verdict === "grounded").length
    : 0;
  const flaggedCount = r ? r.prebrief.findings.length - groundedCount : 0;

  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-4xl px-6 py-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Demo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
            Run a scan through the pipeline
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted">
            Input only, live result only. A scan you provide is shape-checked, sent to the
            model, and every claim is reconciled against that same scan. Nothing here is
            hardcoded: no sample record, no sample result. If it cannot run, the status below
            says why.
          </p>
        </header>

        {/* ---- Input ---- */}
        <section
          aria-labelledby="demo-input-heading"
          className="mt-8 rounded-card border border-hairline bg-surface p-6 shadow-sm"
        >
          <h2 id="demo-input-heading" className="text-lg font-semibold text-ink">
            Scan input
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted">
              Sample scans
            </span>
            {SAMPLES.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => loadSample(s.name)}
                className={
                  s.name.includes("malformed")
                    ? "rounded-control px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
                    : "rounded-control border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40"
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label
              htmlFor="demo-file"
              className="text-xs font-medium uppercase tracking-widest text-muted"
            >
              Scan file
            </label>
            <input
              ref={fileInputRef}
              id="demo-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-control file:border file:border-hairline file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink hover:file:border-accent/40"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="demo-json"
              className="text-xs font-medium uppercase tracking-widest text-muted"
            >
              Or paste JSON
            </label>
            <textarea
              id="demo-json"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (demo.status !== "idle") demo.reset();
              }}
              spellCheck={false}
              rows={9}
              placeholder='{ "date": "2026-08-29", "skin": { ... }, "heart": { ... }, "blood": { ... }, "body": { ... } }'
              className="mt-2 block w-full rounded-control border border-hairline bg-surface p-3 font-mono text-xs leading-5 text-ink shadow-inner placeholder:text-muted/60"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={demo.status === "running"}
              className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {demo.status === "running" ? "Running..." : "Run pre-brief"}
            </button>
            <button
              type="button"
              onClick={() => {
                setText("");
                setReadError(null);
                setEditingDebrief(false);
                demo.reset();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={demo.status === "running" || (!text && demo.status === "idle")}
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
          aria-labelledby="demo-status-heading"
          aria-live="polite"
          className="mt-6 rounded-card border border-hairline bg-surface p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="demo-status-heading" className="text-lg font-semibold text-ink">
              Process status
            </h2>
            <span className={`text-sm font-medium ${statusTone}`}>{statusLabel}</span>
          </div>

          <ol className="mt-4 space-y-2">
            {demo.steps.map((step) => (
              <li key={step.label} className="flex gap-3 text-sm">
                <span aria-hidden className={`mt-0.5 ${STEP_TEXT[step.state]}`}>
                  {STEP_MARK[step.state]}
                </span>
                <span>
                  <span
                    className={
                      step.state === "pending" ? "text-muted" : "font-medium text-ink"
                    }
                  >
                    {step.label}
                  </span>
                  <span className="ml-2 text-xs text-muted">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          {demo.status === "idle" ? (
            <p className="mt-4 text-sm text-muted">
              Waiting for a scan. Nothing has been sent.
            </p>
          ) : null}

          {demo.status === "running" ? (
            <p className="mt-4 text-sm text-accent">
              Validating the shape, calling the model, then reconciling. One request.
            </p>
          ) : null}

          {demo.status === "done" && r ? (
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

          {demo.status === "error" ? (
            <div
              role="alert"
              className="mt-4 rounded-control border border-risk-priority-tint bg-risk-priority-tint p-3 text-sm text-risk-priority-fg"
            >
              <p className="font-medium">
                {demo.errorKind === "json" && "Not sent: the input is not valid JSON."}
                {demo.errorKind === "shape" && "Rejected at the input gate. Nothing was generated."}
                {demo.errorKind === "no-key" && "Cannot run live."}
                {demo.errorKind === "model" && "The model call failed. Nothing was generated."}
                {demo.errorKind === null && "Stopped."}
              </p>
              {demo.errorMessage ? <p className="mt-1">{demo.errorMessage}</p> : null}
            </div>
          ) : null}
        </section>

        {/* ---- Live result ---- */}
        {demo.status === "done" && r ? (
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

            <div className="mt-8 space-y-12">
              <DeltasSection deltas={r.prebrief.deltas} firstVisit />
              <div className="space-y-8">
                <FindingsSection
                  findings={demo.findings}
                  locked={demo.isSignedOff}
                  decide={demo.decide}
                  reopen={demo.reopen}
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
              aria-labelledby="demo-signoff-heading"
              className="mt-12 rounded-card border border-hairline bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="demo-signoff-heading" className="text-lg font-semibold text-ink">
                    Sign off
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {demo.isSignedOff ? (
                      <span className="font-medium text-risk-good-fg">
                        Brief signed off. Nothing here reaches a member without this step.
                      </span>
                    ) : demo.total === 0 ? (
                      "No findings to resolve. You can sign off."
                    ) : (
                      <>
                        <span className="tnum font-medium text-ink">
                          {demo.resolvedCount} of {demo.total}
                        </span>{" "}
                        findings resolved. Accept, edit, or dismiss every finding to sign off.
                      </>
                    )}
                  </p>
                </div>

                {!demo.isSignedOff ? (
                  <button
                    type="button"
                    onClick={demo.signOff}
                    disabled={!demo.canSignOff}
                    className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sign off brief
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {!demo.debriefDraft ? (
                      <button
                        type="button"
                        onClick={demo.draftDebrief}
                        disabled={demo.debriefStatus === "running"}
                        className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {demo.debriefStatus === "running" ? "Drafting..." : "Draft member debrief"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="rounded-control border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/40"
                    >
                      Mark complete
                    </button>
                  </div>
                )}
              </div>

              {demo.debriefStatus === "error" ? (
                <div
                  role="alert"
                  className="mt-4 rounded-control border border-risk-priority-tint bg-risk-priority-tint p-3 text-sm text-risk-priority-fg"
                >
                  The debrief could not be drafted.
                  {demo.debriefError ? <span className="mt-1 block">{demo.debriefError}</span> : null}
                </div>
              ) : null}

              {demo.debrief && demo.debriefDraft ? (
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
                          {demo.hasDebriefEdits ? (
                            <button
                              type="button"
                              onClick={demo.revertDebrief}
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
                          initial={demo.debrief}
                          onSave={(edited) => {
                            demo.saveDebriefEdits(edited);
                            setEditingDebrief(false);
                          }}
                          onCancel={() => setEditingDebrief(false)}
                        />
                      ) : (
                        <DebriefDocument debrief={demo.debrief} />
                      )}
                    </div>
                  </div>

                  {demo.hasDebriefEdits && !editingDebrief ? (
                    <FlywheelDiff draft={demo.debriefDraft} current={demo.debrief} />
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
