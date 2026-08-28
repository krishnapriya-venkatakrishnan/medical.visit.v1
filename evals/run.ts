/**
 * Adversarial eval for the reconciler. Run with `npm run eval`.
 *
 * Reports two numbers, mirroring a fintech reconciliation posture:
 *   catch rate            - adversarial findings the reconciler did not pass
 *   false-rejection rate  - clean findings the reconciler wrongly rejected
 *
 * Exits non-zero if the catch rate is below 100% or any clean case is rejected.
 */

import { reconcile } from "../lib/reconcile";
import { record, cleanCases, adversarialCases } from "./cases";

let failures = 0;

console.log("\nCLEAN SET (expect: grounded)\n" + "-".repeat(48));
let cleanRejected = 0;
let cleanFlagged = 0;
for (const { name, finding } of cleanCases) {
  const { verdict, checks } = reconcile(finding, record);
  const ok = verdict === "grounded";
  if (verdict === "rejected") cleanRejected++;
  if (verdict === "flagged") cleanFlagged++;
  if (!ok) failures++;
  const mark = ok ? "ok  " : "FAIL";
  console.log(`  ${mark}  ${name}  ->  ${verdict}`);
  if (!ok) {
    for (const c of checks.filter((c) => !c.passed)) console.log(`         - ${c.name}: ${c.detail}`);
  }
}

console.log("\nADVERSARIAL SET (expect: caught)\n" + "-".repeat(48));
let caught = 0;
for (const { name, finding, expect } of adversarialCases) {
  const { verdict } = reconcile(finding, record);
  const isCaught = verdict !== "grounded";
  if (isCaught) caught++;
  const matchedExpectation = verdict === expect;
  if (!isCaught) failures++;
  const mark = isCaught ? (matchedExpectation ? "ok  " : "ok* ") : "MISS";
  console.log(`  ${mark}  ${name}  ->  ${verdict}${matchedExpectation ? "" : ` (expected ${expect})`}`);
}

const catchRate = (caught / adversarialCases.length) * 100;
const falseRejectionRate = (cleanRejected / cleanCases.length) * 100;

console.log("\nSUMMARY\n" + "-".repeat(48));
console.log(`  catch rate            ${catchRate.toFixed(0)}%  (${caught}/${adversarialCases.length} adversarial caught)`);
console.log(`  false-rejection rate  ${falseRejectionRate.toFixed(0)}%  (${cleanRejected}/${cleanCases.length} clean rejected)`);
console.log(`  clean flagged         ${cleanFlagged}/${cleanCases.length}`);
console.log();

if (failures > 0 || catchRate < 100 || cleanRejected > 0) {
  console.error(`FAILED: ${failures} case(s) did not meet expectations.\n`);
  process.exit(1);
}
console.log("PASSED\n");
