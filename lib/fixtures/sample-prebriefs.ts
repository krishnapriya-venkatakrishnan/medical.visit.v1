/**
 * Hardcoded sample pre-briefs, one per synthetic member.
 *
 * These stand in for the model output when no ANTHROPIC_API_KEY is set. They are
 * still run through the deterministic reconciler (`lib/reconcile.ts`), so the
 * demo exercises every verdict:
 *   - grounded  findings tie out and the tier agrees.
 *   - flagged   findings tie out but the model's proposedTier is disputed.
 *   - rejected  findings whose cited value does NOT match the record. These are
 *               deliberately planted so the "Caught by reconciler" tray is
 *               populated in the demo. They are obviously illustrative.
 *
 * Authored against `z.input` of the schema (so `status` can be omitted) and
 * parsed on load, so what this module exports is schema-valid.
 */

import type { z } from "zod";
import { PreBriefSchema } from "@/lib/schemas";
import type { PreBrief } from "@/lib/types";

type PreBriefInput = z.input<typeof PreBriefSchema>;

// ---------------------------------------------------------------------------
// Elin A. - catch-it-early. LDL is drifting up; a tracked mole is growing.
// ---------------------------------------------------------------------------
const ELIN_A: PreBriefInput = {
  memberId: "elin-a",
  headline:
    "Broadly well. A tracked mole has grown since last visit and LDL is trending up.",
  deltas: [
    {
      id: "elin-d1",
      metric: "Tracked mole diameter",
      previousValue: 4.8,
      currentValue: 5.2,
      unit: "mm",
      direction: "up",
      valence: "concern",
      summary:
        "The tracked mole on the left shoulder blade grew 0.4 mm since last visit. Border and colour remain regular.",
      provenance: [
        { metric: "skin.flagged[0].diameterMm", value: 4.8, scanDate: "2025-08-19" },
        { metric: "skin.flagged[0].diameterMm", value: 5.2, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "elin-d2",
      metric: "LDL cholesterol",
      previousValue: 3.2,
      currentValue: 3.4,
      unit: "mmol/L",
      direction: "up",
      valence: "concern",
      summary: "LDL rose from 3.2 to 3.4 mmol/L, continuing a slow climb since 2023.",
      provenance: [
        { metric: "blood.ldl", value: 3.2, scanDate: "2025-08-19" },
        { metric: "blood.ldl", value: 3.4, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "elin-d3",
      metric: "Heart rate variability",
      previousValue: 48,
      currentValue: 49,
      unit: "ms",
      direction: "up",
      valence: "improvement",
      summary: "HRV edged up to 49 ms, consistent with steady aerobic fitness.",
      provenance: [
        { metric: "wearables.hrv", value: 48, scanDate: "2025-08-19" },
        { metric: "wearables.hrv", value: 49, scanDate: "2026-08-27" },
      ],
    },
  ],
  findings: [
    {
      id: "elin-f1",
      title: "LDL cholesterol trending up",
      rationale:
        "LDL has risen from 3.2 to 3.4 mmol/L since last visit, continuing a slow climb. HDL is stable, so overall cardiovascular risk stays low, but the trend is worth addressing with diet before it needs medication.",
      claim: {
        kind: "trend",
        metric: "blood.ldl",
        from: 3.2,
        fromDate: "2025-08-19",
        to: 3.4,
        toDate: "2026-08-27",
        direction: "up",
      },
      proposedTier: "watch",
      provenance: [
        { metric: "blood.ldl", value: 3.2, scanDate: "2025-08-19" },
        { metric: "blood.ldl", value: 3.4, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "elin-f2",
      title: "Tracked mole enlarging",
      rationale:
        "The tracked mole on the left shoulder blade grew 0.4 mm since last visit, now 5.2 mm across. Border and colour remain regular, but the growth rate warrants dermoscopy and a shorter recall interval.",
      claim: {
        kind: "level",
        metric: "skin.flagged[0].changeMm",
        value: 0.4,
        scanDate: "2026-08-27",
      },
      proposedTier: "elevated",
      provenance: [
        { metric: "skin.flagged[0].changeMm", value: 0.4, scanDate: "2026-08-27" },
        { metric: "skin.flagged[0].diameterMm", value: 5.2, scanDate: "2026-08-27" },
      ],
    },
    {
      // Planted: the cited value does not match the record (5.9 vs 5.2). The
      // reconciler rejects this on value tie-out and it goes to the tray.
      id: "elin-f3",
      title: "Fasting glucose elevated",
      rationale: "Fasting glucose is 5.9 mmol/L on today's scan, at the top of the normal range and rising.",
      claim: {
        kind: "level",
        metric: "blood.fastingGlucose",
        value: 5.9,
        scanDate: "2026-08-27",
      },
      proposedTier: "elevated",
      provenance: [{ metric: "blood.fastingGlucose", value: 5.9, scanDate: "2026-08-27" }],
    },
  ],
  talkingPoints: [
    "Walk through the mole photo series so Elin can see the change herself, and explain why dermoscopy now rather than waiting a year.",
    "Frame cholesterol as a trend to bend, not a problem. Ask what has changed in diet over the last two years.",
    "Reinforce what is going well: stable weight, good activity, improving HRV.",
  ],
  draftActionPlan: [
    "Refer to dermatology for dermoscopy of the left shoulder-blade lesion within 6 weeks.",
    "Repeat lipid panel in 3 months; trial reduced saturated fat and added soluble fibre in the interim.",
    "Continue current activity levels; no medication changes.",
    "Next full scan in 12 months, or sooner if dermatology advises.",
  ],
};

// ---------------------------------------------------------------------------
// Marcus B. - invisible risk. First visit, so no deltas.
// ---------------------------------------------------------------------------
const MARCUS_B: PreBriefInput = {
  memberId: "marcus-b",
  headline:
    "First visit. Elevated visceral fat and borderline blood pressure stand out for discussion.",
  deltas: [],
  findings: [
    {
      id: "marcus-f1",
      title: "Visceral fat above target",
      rationale:
        "Visceral fat index is 14, above target. This is the largest modifiable risk factor in the scan and links directly to the blood-pressure and lipid findings.",
      claim: {
        kind: "level",
        metric: "body.visceralFatIndex",
        value: 14,
        scanDate: "2026-08-27",
      },
      proposedTier: "elevated",
      provenance: [{ metric: "body.visceralFatIndex", value: 14, scanDate: "2026-08-27" }],
    },
    {
      id: "marcus-f2",
      title: "Blood pressure in stage 1 range",
      rationale:
        "Blood pressure is 138 over 89 on this first scan, with arterial stiffness of 9.6 above the range for age. A single reading, so it needs home monitoring to confirm, but the stiffness makes a real trend likely.",
      claim: {
        kind: "level",
        metric: "heart.bpSystolic",
        value: 138,
        scanDate: "2026-08-27",
      },
      proposedTier: "elevated",
      provenance: [
        { metric: "heart.bpSystolic", value: 138, scanDate: "2026-08-27" },
        { metric: "heart.bpDiastolic", value: 89, scanDate: "2026-08-27" },
        { metric: "heart.arterialStiffness", value: 9.6, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "marcus-f3",
      title: "Low HDL with raised triglycerides",
      rationale:
        "HDL is 1.05 mmol/L, on the low side, with triglycerides at 2.1. The same changes that address visceral fat usually lift HDL.",
      claim: {
        kind: "level",
        metric: "blood.hdl",
        value: 1.05,
        scanDate: "2026-08-27",
      },
      proposedTier: "watch",
      provenance: [
        { metric: "blood.hdl", value: 1.05, scanDate: "2026-08-27" },
        { metric: "blood.triglycerides", value: 2.1, scanDate: "2026-08-27" },
      ],
    },
    {
      // Planted: cited HbA1c 44, record has 39. Rejected on value tie-out.
      id: "marcus-f4",
      title: "HbA1c in the pre-diabetes range",
      rationale: "HbA1c is 44 mmol/mol, in the pre-diabetes range and worth an early recheck.",
      claim: {
        kind: "level",
        metric: "blood.hba1c",
        value: 44,
        scanDate: "2026-08-27",
      },
      proposedTier: "elevated",
      provenance: [{ metric: "blood.hba1c", value: 44, scanDate: "2026-08-27" }],
    },
  ],
  talkingPoints: [
    "This is a first scan, so frame everything as a baseline, not a verdict. Marcus had no idea about the visceral fat or blood pressure.",
    "Connect the findings: visceral fat, blood pressure and HDL are one story, not three problems.",
    "Ask about home BP monitoring and whether he is open to a structured activity and diet plan.",
  ],
  draftActionPlan: [
    "Home blood-pressure monitoring for 2 weeks; bring readings to a follow-up call.",
    "Structured plan targeting visceral fat: resistance training twice weekly, reduce refined carbohydrate and alcohol.",
    "Repeat lipids, HbA1c and fasting glucose in 3 months.",
    "Follow-up consultation in 6 weeks to review the BP log and agree next steps.",
  ],
};

// ---------------------------------------------------------------------------
// Priya C. - good news. Broad improvement, no findings, empty tray.
// ---------------------------------------------------------------------------
const PRIYA_C: PreBriefInput = {
  memberId: "priya-c",
  headline: "Strong year. Cardiometabolic markers have improved across the board.",
  deltas: [
    {
      id: "priya-d1",
      metric: "Visceral fat index",
      previousValue: 7,
      currentValue: 6,
      direction: "down",
      valence: "improvement",
      summary: "Visceral fat index is 6, down from 11 a year ago and now within the healthy range.",
      provenance: [
        { metric: "body.visceralFatIndex", value: 11, scanDate: "2025-08-25" },
        { metric: "body.visceralFatIndex", value: 6, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "priya-d2",
      metric: "LDL cholesterol",
      previousValue: 3.2,
      currentValue: 3.0,
      unit: "mmol/L",
      direction: "down",
      valence: "improvement",
      summary: "LDL is down to 3.0 mmol/L, a steady fall from 3.9 mmol/L last year.",
      provenance: [
        { metric: "blood.ldl", value: 3.9, scanDate: "2025-08-25" },
        { metric: "blood.ldl", value: 3.0, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "priya-d3",
      metric: "Resting heart rate",
      previousValue: 68,
      currentValue: 64,
      unit: "bpm",
      direction: "down",
      valence: "improvement",
      summary: "Resting heart rate is 64 bpm, down from 78 bpm a year ago.",
      provenance: [
        { metric: "heart.restingHr", value: 78, scanDate: "2025-08-25" },
        { metric: "heart.restingHr", value: 64, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "priya-d4",
      metric: "C-reactive protein",
      previousValue: 1.3,
      currentValue: 0.9,
      unit: "mg/L",
      direction: "down",
      valence: "improvement",
      summary: "CRP fell to 0.9 mg/L, from 3.1 mg/L a year ago, and is now low.",
      provenance: [
        { metric: "blood.crp", value: 3.1, scanDate: "2025-08-25" },
        { metric: "blood.crp", value: 0.9, scanDate: "2026-08-27" },
      ],
    },
  ],
  findings: [],
  talkingPoints: [
    "Lead with the win. A year of consistent habit change is visible in almost every marker.",
    "Ask what changed and what felt sustainable, so the plan builds on her own approach.",
    "Grip strength is the one area still below range, though improving; worth a light mention.",
  ],
  draftActionPlan: [
    "Continue current activity and diet; no medication changes.",
    "Add two short resistance sessions a week to bring grip strength into range.",
    "Next full scan in 12 months.",
  ],
};

const SAMPLES: Record<string, PreBriefInput> = {
  "elin-a": ELIN_A,
  "marcus-b": MARCUS_B,
  "priya-c": PRIYA_C,
};

export const SAMPLE_PREBRIEFS: Record<string, PreBrief> = Object.fromEntries(
  Object.entries(SAMPLES).map(([id, value]) => [id, PreBriefSchema.parse(value)]),
);

export function getSamplePreBrief(memberId: string): PreBrief | undefined {
  return SAMPLE_PREBRIEFS[memberId];
}
