"use client";

import { useMemo } from "react";
import { runDeterministicCatalog, type CatalogRow, type Verdict } from "@/lib/harness-run";
import { HARNESS_CATALOG, type HarnessLayer } from "@/lib/harness-catalog";
import { Code, withInlineCode } from "@/components/ui/code";

const VERDICT_STYLE: Record<Verdict, string> = {
  grounded: "text-risk-good-fg",
  flagged: "text-risk-elevated-fg",
  rejected: "text-risk-priority-fg",
};

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        pass
          ? "bg-risk-good-tint text-risk-good-fg"
          : "bg-risk-priority-tint text-risk-priority-fg"
      }`}
    >
      {pass ? "pass" : "fail"}
    </span>
  );
}

function CaseRow({ row }: { row: CatalogRow }) {
  return (
    <details className="group rounded-control border border-hairline bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-sm">
        <PassBadge pass={row.pass} />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-ink">{row.name}</span>
          <span className="ml-2 text-xs text-muted">{row.kind}</span>
        </span>
        <span className="shrink-0 text-xs text-muted">
          expected <span className={`font-medium ${VERDICT_STYLE[row.expected]}`}>{row.expected}</span>
          {" · "}
          actual <span className={`font-medium ${VERDICT_STYLE[row.actual]}`}>{row.actual}</span>
        </span>
        <span aria-hidden className="shrink-0 text-xs text-muted group-open:hidden">
          show
        </span>
        <span aria-hidden className="hidden shrink-0 text-xs text-muted group-open:inline">
          hide
        </span>
      </summary>
      <div className="border-t border-hairline p-3">
        {row.derivedTier ? (
          <p className="mb-2 text-xs text-muted">
            <Code>derivedTier</Code>: <span className="font-medium text-ink">{row.derivedTier}</span>
            {!row.matched ? " · caught, verdict differs from the labelled expectation" : ""}
          </p>
        ) : null}
        <ul className="space-y-1.5">
          {row.checks.map((c, i) => (
            <li key={i} className="flex gap-2 text-xs">
              <span
                className={c.passed ? "text-risk-good-fg" : "text-risk-priority-fg"}
                aria-hidden
              >
                {c.passed ? "●" : "✕"}
              </span>
              <span>
                <span className="font-medium text-ink">{c.name}</span>
                <span className="ml-1.5 text-muted">({c.severity})</span>
                <span className="ml-1.5 text-muted">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function CatalogGroup({ layer }: { layer: HarnessLayer }) {
  const info = HARNESS_CATALOG[layer];
  return (
    <div>
      <span className="inline-flex items-center rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-muted">
        {info.badge}
      </span>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted">{withInlineCode(info.blurb)}</p>
      <ul className="mt-3 space-y-3">
        {info.cases.map((c) => (
          <li key={c.name} className="rounded-control border border-hairline bg-surface p-4">
            <p className="text-sm font-semibold text-ink">{c.name}</p>
            <p className="mt-1.5 text-xs leading-5 text-ink">
              <span className="font-medium text-muted">Given</span> {withInlineCode(c.given)}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink">
              <span className="font-medium text-muted">Expect</span> {withInlineCode(c.expect)}
            </p>
            <p className="mt-1.5 text-xs italic leading-5 text-muted">{withInlineCode(c.why)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HarnessSuiteView() {
  const result = useMemo(() => runDeterministicCatalog(), []);
  const clean = result.rows.filter((r) => r.group === "clean");
  const adversarial = result.rows.filter((r) => r.group === "adversarial");
  const greenCount = result.rows.filter((r) => r.pass).length;

  return (
    <main className="flex-1 bg-linear-to-b from-white to-icy">
      <div className="mx-auto w-full max-w-4xl px-6 py-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Harness suite</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
            The test catalog
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted">
            The deterministic reconciler cases run here, in your browser, against the same
            frozen record and the same <Code>lib/reconcile.ts</Code> used in production. The
            model-facing cases are documented below.
          </p>
          <p className="mt-3 max-w-prose rounded-control bg-surface-sunken p-3 text-xs leading-5 text-muted">
            Deterministic cases run here and in <Code>npm run eval</Code>. Model cases run via{" "}
            <Code>npm test</Code> (mocked) and <Code>npm run eval:model</Code> (live).
          </p>
        </header>

        {/* Part A */}
        <section aria-labelledby="det-heading" className="mt-10">
          <h2 id="det-heading" className="text-lg font-semibold text-ink">
            Deterministic reconciler, run live
          </h2>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-card border border-hairline bg-surface p-4 text-sm shadow-sm">
            <span className="text-muted">
              catch rate{" "}
              <span
                className={`tnum font-semibold ${
                  result.catchRate === 100 ? "text-risk-good-fg" : "text-risk-priority-fg"
                }`}
              >
                {result.catchRate.toFixed(0)}%
              </span>{" "}
              ({result.caught}/{result.adversarialTotal})
            </span>
            <span className="text-muted">
              false-rejection rate{" "}
              <span
                className={`tnum font-semibold ${
                  result.falseRejectionRate === 0 ? "text-risk-good-fg" : "text-risk-priority-fg"
                }`}
              >
                {result.falseRejectionRate.toFixed(0)}%
              </span>{" "}
              ({result.cleanRejected}/{result.cleanTotal})
            </span>
            <span className="text-muted">
              <span
                className={`tnum font-semibold ${
                  result.allGreen ? "text-risk-good-fg" : "text-risk-priority-fg"
                }`}
              >
                {greenCount}/{result.rows.length}
              </span>{" "}
              cases green
            </span>
          </div>

          <h3 className="mt-6 text-xs font-medium uppercase tracking-widest text-muted">
            Clean set (expect grounded)
          </h3>
          <div className="mt-2 space-y-2">
            {clean.map((row) => (
              <CaseRow key={`${row.kind}-${row.name}`} row={row} />
            ))}
          </div>

          <h3 className="mt-6 text-xs font-medium uppercase tracking-widest text-muted">
            Adversarial set (expect caught)
          </h3>
          <div className="mt-2 space-y-2">
            {adversarial.map((row) => (
              <CaseRow key={`${row.kind}-${row.name}`} row={row} />
            ))}
          </div>
        </section>

        {/* Part B */}
        <section aria-labelledby="model-heading" className="mt-12">
          <h2 id="model-heading" className="text-lg font-semibold text-ink">
            Model layer, documented
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Not run in the browser. These execute in CI (mocked) and, for the quality set, against
            the live API.
          </p>
          <div className="mt-4 space-y-8">
            <CatalogGroup layer="plumbing" />
            <CatalogGroup layer="quality" />
          </div>
        </section>
      </div>
    </main>
  );
}
