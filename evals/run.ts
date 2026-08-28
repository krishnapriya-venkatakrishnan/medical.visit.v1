/**
 * Adversarial eval for the reconciler. Run with `npm run eval`.
 *
 * Covers findings AND deltas. Reports two numbers, mirroring a fintech
 * reconciliation posture:
 *   catch rate            - adversarial items the reconciler did not pass
 *   false-rejection rate  - clean items the reconciler wrongly rejected
 *
 * Exits non-zero if the catch rate is below 100% or any clean item is rejected.
 */

import { reconcile, reconcileDelta } from "../lib/reconcile";
import {
  record,
  cleanCases,
  adversarialCases,
  cleanDeltas,
  adversarialDeltas,
} from "./cases";

let failures = 0;
let cleanTotal = 0;
let cleanRejected = 0;
let cleanFlagged = 0;
let adversarialTotal = 0;
let caught = 0;

const rule = "-".repeat(52);

console.log("\nCLEAN SET (expect: grounded)\n" + rule);
for (const { name, finding } of cleanCases) {
  const { verdict, checks } = reconcile(finding, record);
  cleanTotal++;
  if (verdict === "rejected") cleanRejected++;
  if (verdict === "flagged") cleanFlagged++;
  const ok = verdict === "grounded";
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  finding  ${name}  ->  ${verdict}`);
  if (!ok) for (const c of checks.filter((c) => !c.passed)) console.log(`          - ${c.name}: ${c.detail}`);
}
for (const { name, delta } of cleanDeltas) {
  const { verdict, checks } = reconcileDelta(delta, record);
  cleanTotal++;
  if (verdict === "rejected") cleanRejected++;
  const ok = verdict === "grounded";
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  delta    ${name}  ->  ${verdict}`);
  if (!ok) for (const c of checks.filter((c) => !c.passed)) console.log(`          - ${c.name}: ${c.detail}`);
}

console.log("\nADVERSARIAL SET (expect: caught)\n" + rule);
for (const { name, finding, expect } of adversarialCases) {
  const { verdict } = reconcile(finding, record);
  adversarialTotal++;
  const isCaught = verdict !== "grounded";
  if (isCaught) caught++;
  else failures++;
  const matched = verdict === expect;
  const mark = isCaught ? (matched ? "ok  " : "ok* ") : "MISS";
  console.log(`  ${mark}  finding  ${name}  ->  ${verdict}${matched ? "" : ` (expected ${expect})`}`);
}
for (const { name, delta, expect } of adversarialDeltas) {
  const { verdict } = reconcileDelta(delta, record);
  adversarialTotal++;
  const isCaught = verdict !== "grounded";
  if (isCaught) caught++;
  else failures++;
  const matched = verdict === expect;
  const mark = isCaught ? (matched ? "ok  " : "ok* ") : "MISS";
  console.log(`  ${mark}  delta    ${name}  ->  ${verdict}${matched ? "" : ` (expected ${expect})`}`);
}

const catchRate = (caught / adversarialTotal) * 100;
const falseRejectionRate = (cleanRejected / cleanTotal) * 100;

console.log("\nSUMMARY (findings + deltas)\n" + rule);
console.log(`  catch rate            ${catchRate.toFixed(0)}%  (${caught}/${adversarialTotal} adversarial caught)`);
console.log(`  false-rejection rate  ${falseRejectionRate.toFixed(0)}%  (${cleanRejected}/${cleanTotal} clean rejected)`);
console.log(`  clean flagged         ${cleanFlagged}/${cleanTotal}`);
console.log();

if (failures > 0 || catchRate < 100 || cleanRejected > 0) {
  console.error(`FAILED: ${failures} case(s) did not meet expectations.\n`);
  process.exit(1);
}
console.log("PASSED\n");
