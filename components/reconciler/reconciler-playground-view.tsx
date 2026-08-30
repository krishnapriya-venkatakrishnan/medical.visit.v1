"use client";

import { useState } from "react";
import { reconcile } from "@/lib/reconcile";
import { FindingSchema, MemberSchema } from "@/lib/schemas";
import type { Claim, Finding, Member, Reconciliation, RiskTier } from "@/lib/types";
import { adversarialCases, cleanCases, record as evalRecord } from "@/evals/cases";
import elinA from "@/lib/fixtures/elin-a.json";
import marcusB from "@/lib/fixtures/marcus-b.json";
import priyaC from "@/lib/fixtures/priya-c.json";
import { Code } from "@/components/ui/code";

type ClaimKind = Claim["kind"];
type RecordKey = "eval" | "elin-a" | "marcus-b" | "priya-c";

const RECORDS: Record<RecordKey, { label: string; member: Member }> = {
  eval: { label: "Eval record (returning, 2 scans a year apart)", member: evalRecord },
  "elin-a": { label: "Elin A. (returning, 4 scans)", member: MemberSchema.parse(elinA) },
  "marcus-b": { label: "Marcus B. (first visit, 1 scan)", member: MemberSchema.parse(marcusB) },
  "priya-c": { label: "Priya C. (returning, 4 scans)", member: MemberSchema.parse(priyaC) },
};

const TIERS: RiskTier[] = ["good", "watch", "elevated", "priority"];

const METRIC_HINTS = [
  "blood.ldl",
  "blood.hdl",
  "blood.hba1c",
  "blood.fastingGlucose",
  "blood.triglycerides",
  "blood.crp",
  "heart.bpSystolic",
  "heart.bpDiastolic",
  "heart.restingHr",
  "heart.arterialStiffness",
  "body.visceralFatIndex",
  "body.bodyFatPct",
  "body.gripStrengthKg",
  "skin.flagged[0].diameterMm",
  "skin.flagged[0].changeMm",
];

const PRESETS: { label: string; id: string; desc: string }[] = [
  {
    label: "Clean",
    id: "c1",
    desc: "Everything lines up. The cited value is in the scan and matches exactly, the model's risk level agrees with the one computed from reference ranges, and the write-up only names backed numbers. Expected result: grounded (shown normally).",
  },
  {
    label: "Fabricated number",
    id: "a1",
    desc: "The finding cites LDL 4.2, but the scan says 3.6. A hard check fails. Expected result: rejected (kept out of the clinical view).",
  },
  {
    label: "Flipped trend",
    id: "a2",
    desc: "The scan shows LDL rising, but the claim says it fell. The direction is recomputed and disagrees. Expected result: rejected.",
  },
  {
    label: "Over-escalated tier",
    id: "a4",
    desc: "The value is real, but the model marks it 'priority' while the reference range puts it at 'watch'. The computed level wins for display; the disagreement is surfaced. Expected result: flagged (review carefully).",
  },
  {
    label: "Unbacked prose",
    id: "a5",
    desc: "The claim ties out, but the sentence mentions an HbA1c reading that is not one of the finding's cited sources. A soft check. Expected result: flagged.",
  },
  {
    label: "Hallucinated metric",
    id: "a3",
    desc: "The finding cites 'blood.vitaminD', a measurement the scan does not contain at all. Expected result: rejected.",
  },
];

const findingById = (id: string): Finding | undefined =>
  [...cleanCases, ...adversarialCases].find((c) => c.finding.id === id)?.finding;

interface ProvRow {
  metric: string;
  value: string;
  scanDate: string;
}

interface ClaimForm {
  kind: ClaimKind;
  metric: string;
  value: string;
  scanDate: string;
  from: string;
  fromDate: string;
  to: string;
  toDate: string;
  direction: "up" | "down";
  note: string;
}

const EMPTY_CLAIM: ClaimForm = {
  kind: "level",
  metric: "blood.ldl",
  value: "3.6",
  scanDate: "2026-01-01",
  from: "3.0",
  fromDate: "2025-01-01",
  to: "3.6",
  toDate: "2026-01-01",
  direction: "up",
  note: "",
};

const isNumeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s.trim());

const VERDICT_STYLE: Record<Reconciliation["verdict"], string> = {
  grounded: "bg-risk-good-tint text-risk-good-fg",
  flagged: "bg-risk-elevated-tint text-risk-elevated-fg",
  rejected: "bg-risk-priority-tint text-risk-priority-fg",
};

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-0.5 block text-[11px] font-normal leading-4 text-muted">{children}</span>;
}

export function ReconcilerPlaygroundView() {
  const [recordKey, setRecordKey] = useState<RecordKey>("eval");
  const [claim, setClaim] = useState<ClaimForm>(EMPTY_CLAIM);
  const [proposedTier, setProposedTier] = useState<RiskTier>("watch");
  const [rationale, setRationale] = useState("LDL is 3.6 mmol/L.");
  const [provenance, setProvenance] = useState<ProvRow[]>([
    { metric: "blood.ldl", value: "3.6", scanDate: "2026-01-01" },
  ]);
  const [result, setResult] = useState<
    { ok: true; reconciliation: Reconciliation } | { ok: false; error: string } | null
  >(null);

  const record = RECORDS[recordKey].member;

  const setClaimField = <K extends keyof ClaimForm>(k: K, v: ClaimForm[K]) =>
    setClaim((c) => ({ ...c, [k]: v }));

  function loadFinding(f: Finding) {
    setProposedTier(f.proposedTier);
    setRationale(f.rationale);
    setProvenance(
      f.provenance.map((p) => ({ metric: p.metric, value: String(p.value), scanDate: p.scanDate })),
    );
    const c = f.claim;
    if (c.kind === "level") {
      setClaim({ ...EMPTY_CLAIM, kind: "level", metric: c.metric, value: String(c.value), scanDate: c.scanDate });
    } else if (c.kind === "trend") {
      setClaim({
        ...EMPTY_CLAIM,
        kind: "trend",
        metric: c.metric,
        from: String(c.from),
        fromDate: c.fromDate,
        to: String(c.to),
        toDate: c.toDate,
        direction: c.direction,
      });
    } else {
      setClaim({ ...EMPTY_CLAIM, kind: "observation", metric: c.metric, scanDate: c.scanDate, note: c.note });
    }
    setResult(null);
  }

  function loadPreset(id: string) {
    const f = findingById(id);
    if (!f) return;
    setRecordKey("eval"); // preset values tie out against the eval record
    loadFinding(f);
  }

  function buildClaim(): Claim {
    if (claim.kind === "level") {
      return { kind: "level", metric: claim.metric, value: Number(claim.value), scanDate: claim.scanDate };
    }
    if (claim.kind === "trend") {
      return {
        kind: "trend",
        metric: claim.metric,
        from: Number(claim.from),
        fromDate: claim.fromDate,
        to: Number(claim.to),
        toDate: claim.toDate,
        direction: claim.direction,
      };
    }
    return { kind: "observation", metric: claim.metric, scanDate: claim.scanDate, note: claim.note };
  }

  function onReconcile() {
    const candidate = {
      id: "playground",
      title: "Playground finding",
      rationale,
      claim: buildClaim(),
      proposedTier,
      provenance: provenance.map((p) => ({
        metric: p.metric,
        value: isNumeric(p.value) ? Number(p.value) : p.value,
        scanDate: p.scanDate,
      })),
      status: "unverified" as const,
    };
    const parsed = FindingSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setResult({ ok: false, error: `Shape invalid at ${issue.path.join(".") || "(root)"}: ${issue.message}` });
      return;
    }
    setResult({ ok: true, reconciliation: reconcile(parsed.data, record) });
  }

  const inputClass =
    "mt-1 block w-full rounded-control border border-hairline bg-surface p-2 text-sm text-ink";
  const labelClass = "text-xs font-medium text-muted";

  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-4xl px-6 py-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Reconciler</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
            Reconcile a finding by hand
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted">
            This runs <Code>lib/reconcile.ts</Code> only, the same deterministic checker used in
            production, in your browser, with no model call. Build a finding, pick a scan history,
            and see every check.
          </p>
        </header>

        {/* ---- Preset cases ---- */}
        <section aria-labelledby="preset-heading" className="mt-8">
          <h2 id="preset-heading" className="text-sm font-semibold text-ink">
            Example cases
          </h2>
          <p className="mt-1 text-xs text-muted">
            Each button loads a ready-made finding and switches to the eval record so its numbers
            line up. Press <span className="font-medium">Reconcile</span> after loading one.
          </p>
          <ul className="mt-3 space-y-2">
            {PRESETS.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-1.5 rounded-control border border-hairline bg-surface p-3 sm:flex-row sm:items-start sm:gap-3"
              >
                <button
                  type="button"
                  onClick={() => loadPreset(p.id)}
                  className="shrink-0 rounded-control border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:border-accent/40 sm:w-40"
                >
                  {p.label}
                </button>
                <p className="text-xs leading-5 text-muted">{p.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Form ---- */}
        <section className="mt-8 rounded-card border border-hairline bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Inputs</h2>

          <label className="mt-4 block">
            <span className={labelClass}>Base record</span>
            <Hint>The scan history the finding is checked against. Every scan and value the finding cites has to exist here.</Hint>
            <select
              value={recordKey}
              onChange={(e) => {
                setRecordKey(e.target.value as RecordKey);
                setResult(null);
              }}
              className={inputClass}
            >
              {(Object.keys(RECORDS) as RecordKey[]).map((k) => (
                <option key={k} value={k}>
                  {RECORDS[k].label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="mt-4">
            <span className={labelClass}>Claim kind</span>
            <Hint>
              level = one value at one date. trend = a value moving between two dates. observation = a
              note with no number to verify.
            </Hint>
            <div className="mt-1 flex gap-3 text-sm">
              {(["level", "trend", "observation"] as ClaimKind[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="claim-kind"
                    checked={claim.kind === k}
                    onChange={() => setClaimField("kind", k)}
                  />
                  {k}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className={labelClass}>metric</span>
            <Hint>
              The path to the measurement inside a scan, for example <Code>blood.ldl</Code> or{" "}
              <Code>heart.bpSystolic</Code>.
            </Hint>
            <input
              list="metric-hints"
              value={claim.metric}
              onChange={(e) => setClaimField("metric", e.target.value)}
              className={`${inputClass} font-mono`}
            />
            <datalist id="metric-hints">
              {METRIC_HINTS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>

          {claim.kind === "level" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>value</span>
                <Hint>The number the finding claims for that measurement.</Hint>
                <input
                  value={claim.value}
                  onChange={(e) => setClaimField("value", e.target.value)}
                  className={`${inputClass} tnum`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>scanDate</span>
                <Hint>
                  Which scan it reads that value from (<Code>YYYY-MM-DD</Code>).
                </Hint>
                <input
                  value={claim.scanDate}
                  onChange={(e) => setClaimField("scanDate", e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </label>
            </div>
          ) : null}

          {claim.kind === "trend" ? (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>from</span>
                  <Hint>The earlier value.</Hint>
                  <input
                    value={claim.from}
                    onChange={(e) => setClaimField("from", e.target.value)}
                    className={`${inputClass} tnum`}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>fromDate</span>
                  <Hint>Date of the earlier scan.</Hint>
                  <input
                    value={claim.fromDate}
                    onChange={(e) => setClaimField("fromDate", e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>to</span>
                  <Hint>The later value.</Hint>
                  <input
                    value={claim.to}
                    onChange={(e) => setClaimField("to", e.target.value)}
                    className={`${inputClass} tnum`}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>toDate</span>
                  <Hint>Date of the later scan.</Hint>
                  <input
                    value={claim.toDate}
                    onChange={(e) => setClaimField("toDate", e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </label>
              </div>
              <label className="block">
                <span className={labelClass}>direction</span>
                <Hint>Which way the finding says the value moved. Checked against the actual difference.</Hint>
                <select
                  value={claim.direction}
                  onChange={(e) => setClaimField("direction", e.target.value as "up" | "down")}
                  className={inputClass}
                >
                  <option value="up">up</option>
                  <option value="down">down</option>
                </select>
              </label>
            </div>
          ) : null}

          {claim.kind === "observation" ? (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className={labelClass}>scanDate</span>
                <Hint>
                  Which scan the note refers to (<Code>YYYY-MM-DD</Code>).
                </Hint>
                <input
                  value={claim.scanDate}
                  onChange={(e) => setClaimField("scanDate", e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>note</span>
                <Hint>A qualitative remark. There is no number here for the reconciler to tie out.</Hint>
                <input
                  value={claim.note}
                  onChange={(e) => setClaimField("note", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          ) : null}

          <label className="mt-4 block">
            <span className={labelClass}>proposedTier</span>
            <Hint>
              The model&rsquo;s guess at the risk level. Never displayed to a clinician. Shown here
              only so you can watch it agree or disagree with the level computed from reference
              ranges.
            </Hint>
            <select
              value={proposedTier}
              onChange={(e) => setProposedTier(e.target.value as RiskTier)}
              className={inputClass}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className={labelClass}>rationale</span>
            <Hint>
              The model&rsquo;s plain-language write-up. Checked so that every number and measurement
              it names also appears in the sources below.
            </Hint>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={3}
              className={`${inputClass} leading-6`}
            />
          </label>

          <div className="mt-4">
            <span className={labelClass}>provenance (sources)</span>
            <Hint>
              The exact measurements the finding is allowed to cite as evidence. Each row is a
              metric path, the value found there, and the scan date.
            </Hint>
            <div className="mt-2 space-y-2">
              {provenance.map((row, i) => (
                <div key={i} className="rounded-control border border-hairline p-2.5">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-[11px] text-muted">metric</span>
                      <input
                        value={row.metric}
                        onChange={(e) =>
                          setProvenance((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, metric: e.target.value } : r)),
                          )
                        }
                        className="mt-0.5 block w-full rounded-control border border-hairline bg-surface p-1.5 font-mono text-xs text-ink"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-muted">value</span>
                      <input
                        value={row.value}
                        onChange={(e) =>
                          setProvenance((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)),
                          )
                        }
                        className="mt-0.5 block w-full rounded-control border border-hairline bg-surface p-1.5 text-xs text-ink tnum"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-muted">scanDate</span>
                      <input
                        value={row.scanDate}
                        onChange={(e) =>
                          setProvenance((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, scanDate: e.target.value } : r)),
                          )
                        }
                        className="mt-0.5 block w-full rounded-control border border-hairline bg-surface p-1.5 font-mono text-xs text-ink"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProvenance((rows) => rows.filter((_, j) => j !== i))}
                    className="mt-1.5 text-[11px] font-medium text-muted hover:text-ink"
                  >
                    remove row
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setProvenance((rows) => [...rows, { metric: "", value: "", scanDate: "" }])
              }
              className="mt-2 rounded-control border border-hairline px-3 py-1 text-xs font-medium text-ink hover:border-accent/40"
            >
              Add row
            </button>
          </div>

          <button
            type="button"
            onClick={onReconcile}
            className="mt-5 rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            Reconcile
          </button>
        </section>

        {/* ---- Result ---- */}
        <section className="mt-8 rounded-card border border-hairline bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Result</h2>

          <div className="mt-3 rounded-control bg-surface-sunken p-3 text-xs leading-5 text-muted">
            <p className="font-medium text-ink">The five checks it runs</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              <li>
                <span className="font-medium text-ink">Referential integrity</span> - every
                measurement the finding cites actually exists in the scan on that date.
              </li>
              <li>
                <span className="font-medium text-ink">Value tie-out</span> - the numbers it cites
                match the scan exactly.
              </li>
              <li>
                <span className="font-medium text-ink">Trend consistency</span> - if it claims a
                direction, the record moves that way when the difference is recomputed.
              </li>
              <li>
                <span className="font-medium text-ink">Tier derivation</span> - the model&rsquo;s
                risk level matches the one computed from reference ranges (or is flagged if no range
                exists for that metric).
              </li>
              <li>
                <span className="font-medium text-ink">Prose coverage</span> - every number and
                measurement named in the write-up is one of the cited sources.
              </li>
            </ol>
            <p className="mt-1.5">
              The first three are hard: a failure <span className="font-medium">rejects</span> the
              finding. The last two are soft: a failure <span className="font-medium">flags</span> it
              for review.
            </p>
          </div>

          {result === null ? (
            <p className="mt-4 text-sm text-muted">
              Edit the finding and press Reconcile. Nothing is sent anywhere.
            </p>
          ) : !result.ok ? (
            <div className="mt-4 rounded-control border border-risk-priority-tint bg-risk-priority-tint p-3 text-sm text-risk-priority-fg">
              {result.error}
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    VERDICT_STYLE[result.reconciliation.verdict]
                  }`}
                >
                  {result.reconciliation.verdict}
                </span>
                <span className="text-xs text-muted">
                  <Code>derivedTier</Code>{" "}
                  <span className="font-medium text-ink">{result.reconciliation.derivedTier}</span>
                  <span className="ml-1">(computed, this is what would display)</span>
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {result.reconciliation.checks.map((c, i) => (
                  <li key={i} className="rounded-control border border-hairline p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={c.passed ? "text-risk-good-fg" : "text-risk-priority-fg"}
                        aria-hidden
                      >
                        {c.passed ? "●" : "✕"}
                      </span>
                      <span className="font-medium text-ink">{c.name}</span>
                      <span className="text-muted">({c.severity})</span>
                      <span
                        className={`ml-auto ${
                          c.passed ? "text-risk-good-fg" : "text-risk-priority-fg"
                        }`}
                      >
                        {c.passed ? "pass" : "fail"}
                      </span>
                    </div>
                    <p className="mt-1 leading-5 text-muted">{c.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
