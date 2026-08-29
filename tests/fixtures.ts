/**
 * The one synthetic record shared by the deterministic eval harness
 * (`evals/cases.ts`) and the unit tests, so test data cannot drift between them.
 *
 * `record` is a returning member with two scans a year apart:
 *   blood.ldl              3.0  -> 3.6
 *   blood.hdl              1.4  -> 1.3
 *   body.visceralFatIndex  8    -> 11   (band watch=10, elevated=14)
 *   heart.bpSystolic       120  -> 134  (band watch=130, elevated=140)
 *   skin.molesTracked      1    -> 1    (flat, one tracked mole)
 *   wearables.hrv          45   -> 42   (no reference range)
 */

import type { Member, Scan } from "@/lib/types";

/** A complete, valid scan with neutral defaults. Mutate the returned object freely. */
export function scanTemplate(date: string): Scan {
  return {
    date,
    skin: {
      molesTracked: 1,
      flagged: [{ id: "m1", location: "upper back", diameterMm: 4.0, changeMm: 0.1, notes: "" }],
    },
    heart: { restingHr: 60, bpSystolic: 120, bpDiastolic: 78, ecgNotes: "NSR", arterialStiffness: 6.0 },
    blood: { ldl: 3.0, hdl: 1.4, triglycerides: 1.0, hba1c: 34, crp: 0.8, fastingGlucose: 5.0 },
    body: { visceralFatIndex: 8, bodyFatPct: 24, gripStrengthKg: 34 },
    wearables: { avgSteps: 8000, avgSleepHrs: 7.0, hrv: 45 },
  };
}

/** Build a member from one or more scans. First visit is inferred from scan count. */
export function memberOf(...scans: Scan[]): Member {
  return {
    id: "eval-member",
    displayName: "Eval E.",
    firstVisit: scans.length === 1,
    scans,
  };
}

const firstScan = scanTemplate("2025-01-01");

const secondScan = scanTemplate("2026-01-01");
secondScan.skin.flagged[0].diameterMm = 4.5;
secondScan.skin.flagged[0].changeMm = 0.5;
secondScan.heart.restingHr = 64;
secondScan.heart.bpSystolic = 134;
secondScan.heart.bpDiastolic = 82;
secondScan.heart.arterialStiffness = 7.0;
secondScan.blood.ldl = 3.6;
secondScan.blood.hdl = 1.3;
secondScan.blood.triglycerides = 1.2;
secondScan.blood.hba1c = 37;
secondScan.blood.crp = 1.0;
secondScan.blood.fastingGlucose = 5.3;
secondScan.body.visceralFatIndex = 11;
secondScan.body.bodyFatPct = 27;
secondScan.body.gripStrengthKg = 33;
secondScan.wearables = { avgSteps: 7000, avgSleepHrs: 6.8, hrv: 42 };

export const record: Member = memberOf(firstScan, secondScan);
