/**
 * LIVE model-quality eval. Run with `npm run eval:model`.
 *
 * This is NOT the deterministic reconciler harness (`npm run eval`). It makes
 * real Anthropic calls (one per fixture member) and asserts PROPERTIES of the
 * generated pre-brief, not exact prose. The headline number: on real synthetic
 * data the model should be copying faithfully, so every generated finding should
 * reconcile to grounded or flagged, never rejected.
 *
 * Gated: if ANTHROPIC_API_KEY is unset it prints "skipped (no API key)" and
 * exits 0. The `eval:model` script passes `--conditions=react-server` so the
 * `server-only` imports in `lib/ai` and `lib/fixtures` resolve to their inert
 * variant under plain tsx, and `--env-file-if-exists=.env` so a configured key
 * is picked up.
 */

import { getMembers } from "../lib/fixtures";
import { generatePreBrief } from "../lib/ai/prebrief";
import { reconcile } from "../lib/reconcile";
import { PreBriefSchema } from "../lib/schemas";
import { hasReferenceRange } from "../lib/reference-ranges";
import type { Member } from "../lib/types";

/** Minimal path resolver: does `metric` @ `scanDate` exist in the record? */
function readMetric(member: Member, metric: string, scanDate: string): unknown {
  const scan = member.scans.find((s) => s.date === scanDate);
  if (!scan) return undefined;
  let node: unknown = scan;
  for (const key of metric.split(".")) {
    const m = key.match(/^([A-Za-z0-9_]+)(?:\[(\d+)\])?$/);
    if (!m || node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[m[1]];
    if (m[2] !== undefined) node = Array.isArray(node) ? node[Number(m[2])] : undefined;
  }
  return node;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("skipped (no API key)");
    process.exit(0);
  }

  let failures = 0;
  let totalFindings = 0;
  let rejectedFindings = 0;
  let flaggedFindings = 0;

  for (const member of getMembers()) {
    console.log(`\n${member.displayName} (${member.id})`);

    let pb;
    try {
      pb = await generatePreBrief(member);
    } catch (err) {
      console.error("  FAIL: generation threw", err);
      failures++;
      continue;
    }

    if (!PreBriefSchema.safeParse(pb).success) {
      console.error("  FAIL: output does not pass PreBriefSchema");
      failures++;
    }

    if (member.firstVisit) {
      const trends = pb.findings.filter((f) => f.claim.kind === "trend").length;
      const ok = pb.deltas.length === 0 && trends === 0;
      console.log(`  first visit: ${pb.deltas.length} deltas, ${trends} trend claims -> ${ok ? "ok" : "FAIL"}`);
      if (!ok) failures++;
    }

    for (const f of pb.findings) {
      totalFindings++;
      const verdict = reconcile(f, member).verdict;
      if (verdict === "flagged") flaggedFindings++;
      if (verdict === "rejected") {
        rejectedFindings++;
        failures++;
        console.error(`  REJECTED: "${f.title}" (${f.claim.kind} ${f.claim.metric})`);
      }
    }

    const refs: Array<{ metric: string; scanDate: string }> = [];
    for (const f of pb.findings) {
      const c = f.claim;
      if (c.kind === "trend") {
        refs.push({ metric: c.metric, scanDate: c.fromDate }, { metric: c.metric, scanDate: c.toDate });
      } else {
        refs.push({ metric: c.metric, scanDate: c.scanDate });
      }
    }
    for (const d of pb.deltas) for (const p of d.provenance) {
      refs.push({ metric: p.metric, scanDate: p.scanDate });
    }
    const unresolved = refs.filter((r) => readMetric(member, r.metric, r.scanDate) === undefined);
    if (unresolved.length > 0) {
      failures++;
      for (const r of unresolved) console.error(`  FAIL: metric does not resolve: ${r.metric} @ ${r.scanDate}`);
    } else {
      console.log(`  ${refs.length} claim/delta metrics all resolve`);
    }

    for (const f of pb.findings) {
      if (f.claim.kind !== "observation") continue;
      const value = readMetric(member, f.claim.metric, f.claim.scanDate);
      if (typeof value === "number" && hasReferenceRange(f.claim.metric)) {
        failures++;
        console.error(`  FAIL: observation claim on a checkable number: ${f.claim.metric} = ${value}`);
      }
    }

    console.log(`  ${pb.findings.length} findings, ${pb.deltas.length} deltas`);
  }

  console.log("\n" + "-".repeat(52));
  console.log(
    `  findings reconciled  ${totalFindings - rejectedFindings}/${totalFindings} grounded-or-flagged` +
      ` (${flaggedFindings} flagged)`,
  );
  console.log(`  findings rejected    ${rejectedFindings}`);
  console.log();

  if (failures > 0) {
    console.error(`FAILED: ${failures} model-quality assertion(s).\n`);
    process.exit(1);
  }
  console.log("PASSED\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
