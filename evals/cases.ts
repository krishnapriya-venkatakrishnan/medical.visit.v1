/**
 * Eval fixtures for the deterministic reconciler (spec section 4.5).
 *
 * A small synthetic record, CLEAN sets (findings and deltas that tie out and
 * should pass), and ADVERSARIAL sets of poisoned items - one per failure mode the
 * reconciler exists to catch. `evals/run.ts` asserts every adversarial item is
 * caught and no clean item is falsely rejected, and prints the two numbers.
 */

import type { Delta, Finding, Member } from "../lib/types";

export const record: Member = {
  id: "eval-member",
  displayName: "Eval E.",
  firstVisit: false,
  scans: [
    {
      date: "2025-01-01",
      skin: {
        molesTracked: 1,
        flagged: [{ id: "m1", location: "upper back", diameterMm: 4.0, changeMm: 0.1, notes: "" }],
      },
      heart: { restingHr: 60, bpSystolic: 120, bpDiastolic: 78, ecgNotes: "NSR", arterialStiffness: 6.0 },
      blood: { ldl: 3.0, hdl: 1.4, triglycerides: 1.0, hba1c: 34, crp: 0.8, fastingGlucose: 5.0 },
      body: { visceralFatIndex: 8, bodyFatPct: 24, gripStrengthKg: 34 },
      wearables: { avgSteps: 8000, avgSleepHrs: 7.0, hrv: 45 },
    },
    {
      date: "2026-01-01",
      skin: {
        molesTracked: 1,
        flagged: [{ id: "m1", location: "upper back", diameterMm: 4.5, changeMm: 0.5, notes: "" }],
      },
      heart: { restingHr: 64, bpSystolic: 134, bpDiastolic: 82, ecgNotes: "NSR", arterialStiffness: 7.0 },
      blood: { ldl: 3.6, hdl: 1.3, triglycerides: 1.2, hba1c: 37, crp: 1.0, fastingGlucose: 5.3 },
      body: { visceralFatIndex: 11, bodyFatPct: 27, gripStrengthKg: 33 },
      wearables: { avgSteps: 7000, avgSleepHrs: 6.8, hrv: 42 },
    },
  ],
};

function mkFinding(f: Omit<Finding, "status">): Finding {
  return { ...f, status: "unverified" };
}

export const cleanCases: Array<{ name: string; finding: Finding }> = [
  {
    name: "level, ties out, tier agrees",
    finding: mkFinding({
      id: "c1",
      title: "LDL at watch level",
      rationale: "LDL is 3.6 mmol/L.",
      claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [{ metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "trend, direction matches the record",
    finding: mkFinding({
      id: "c2",
      title: "LDL rising",
      rationale: "LDL rose from 3.0 to 3.6 mmol/L over the year.",
      claim: {
        kind: "trend",
        metric: "blood.ldl",
        from: 3.0,
        fromDate: "2025-01-01",
        to: 3.6,
        toDate: "2026-01-01",
        direction: "up",
      },
      proposedTier: "watch",
      provenance: [
        { metric: "blood.ldl", value: 3.0, scanDate: "2025-01-01" },
        { metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      ],
    }),
  },
  {
    name: "visceral fat, tier agrees",
    finding: mkFinding({
      id: "c3",
      title: "Visceral fat at watch level",
      rationale: "Visceral fat index is 11.",
      claim: { kind: "level", metric: "body.visceralFatIndex", value: 11, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [{ metric: "body.visceralFatIndex", value: 11, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "systolic BP, tier agrees",
    finding: mkFinding({
      id: "c4",
      title: "Blood pressure at watch level",
      rationale: "Systolic blood pressure is 134 mmHg.",
      claim: { kind: "level", metric: "heart.bpSystolic", value: 134, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [{ metric: "heart.bpSystolic", value: 134, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "metric names in the prose, all backed by provenance",
    finding: mkFinding({
      id: "c5",
      title: "Blood pressure with context",
      rationale: "Systolic blood pressure is 134 mmHg; resting heart rate is unremarkable.",
      claim: { kind: "level", metric: "heart.bpSystolic", value: 134, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [
        { metric: "heart.bpSystolic", value: 134, scanDate: "2026-01-01" },
        { metric: "heart.restingHr", value: 64, scanDate: "2026-01-01" },
      ],
    }),
  },
];

export const adversarialCases: Array<{
  name: string;
  finding: Finding;
  expect: "rejected" | "flagged";
}> = [
  {
    name: "fabricated number (cited 4.2, record 3.6)",
    expect: "rejected",
    finding: mkFinding({
      id: "a1",
      title: "LDL high",
      rationale: "LDL is 4.2 mmol/L.",
      claim: { kind: "level", metric: "blood.ldl", value: 4.2, scanDate: "2026-01-01" },
      proposedTier: "elevated",
      provenance: [{ metric: "blood.ldl", value: 4.2, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "flipped trend (record goes up, claim says down)",
    expect: "rejected",
    finding: mkFinding({
      id: "a2",
      title: "LDL improving",
      rationale: "LDL fell from 3.0 to 3.6 mmol/L.",
      claim: {
        kind: "trend",
        metric: "blood.ldl",
        from: 3.0,
        fromDate: "2025-01-01",
        to: 3.6,
        toDate: "2026-01-01",
        direction: "down",
      },
      proposedTier: "good",
      provenance: [
        { metric: "blood.ldl", value: 3.0, scanDate: "2025-01-01" },
        { metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      ],
    }),
  },
  {
    name: "hallucinated metric (not captured in the record)",
    expect: "rejected",
    finding: mkFinding({
      id: "a3",
      title: "Vitamin D low",
      rationale: "Vitamin D is 50 nmol/L, at the low end.",
      claim: { kind: "level", metric: "blood.vitaminD", value: 50, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [{ metric: "blood.vitaminD", value: 50, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "over-escalated tier (record-derived watch, model says priority)",
    expect: "flagged",
    finding: mkFinding({
      id: "a4",
      title: "Visceral fat critical",
      rationale: "Visceral fat index is 11.",
      claim: { kind: "level", metric: "body.visceralFatIndex", value: 11, scanDate: "2026-01-01" },
      proposedTier: "priority",
      provenance: [{ metric: "body.visceralFatIndex", value: 11, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "unbacked number in the prose (no provenance for HbA1c)",
    expect: "flagged",
    finding: mkFinding({
      id: "a5",
      title: "Early metabolic picture",
      rationale: "LDL is 3.6 mmol/L; taken with an HbA1c of 37 this is an early metabolic picture.",
      claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [{ metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" }],
    }),
  },
  {
    name: "unbacked metric name in the prose (grip strength, no provenance)",
    expect: "flagged",
    finding: mkFinding({
      id: "a6",
      title: "Cardiometabolic note",
      rationale: "LDL is 3.6 mmol/L; grip strength also looks low this year.",
      claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      proposedTier: "watch",
      provenance: [{ metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" }],
    }),
  },
];

// ---------------------------------------------------------------------------
// Deltas
// ---------------------------------------------------------------------------

export const cleanDeltas: Array<{ name: string; delta: Delta }> = [
  {
    name: "delta ties out, displayed values backed",
    delta: {
      id: "cd1",
      metric: "LDL cholesterol",
      previousValue: 3.0,
      currentValue: 3.6,
      unit: "mmol/L",
      direction: "up",
      valence: "concern",
      summary: "LDL rose from 3.0 to 3.6 mmol/L over the year.",
      provenance: [
        { metric: "blood.ldl", value: 3.0, scanDate: "2025-01-01" },
        { metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      ],
    },
  },
];

export const adversarialDeltas: Array<{ name: string; delta: Delta; expect: "rejected" }> = [
  {
    name: "fabricated currentValue (delta shows 4.5, record/provenance say 3.6)",
    expect: "rejected",
    delta: {
      id: "ad1",
      metric: "LDL cholesterol",
      previousValue: 3.0,
      currentValue: 4.5,
      unit: "mmol/L",
      direction: "up",
      valence: "concern",
      summary: "LDL rose to 4.5 mmol/L.",
      provenance: [
        { metric: "blood.ldl", value: 3.0, scanDate: "2025-01-01" },
        { metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
      ],
    },
  },
];
