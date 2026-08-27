/**
 * Hardcoded sample pre-briefs, one per synthetic member.
 *
 * STAGE 3: these let the Pre-Brief screen be built and reviewed before live AI
 * is wired. In Stage 4 they are replaced by the output of `POST /api/prebrief`,
 * which produces the same shape from the member's record via the Anthropic API.
 *
 * Each object is authored against `z.input` of the schema (so `status` can be
 * omitted) and then parsed, so what this module exports is guaranteed valid and
 * every finding / delta carries the provenance the constitution requires.
 */

import type { z } from "zod";
import { PreBriefSchema } from "@/lib/schemas";
import type { PreBrief } from "@/lib/types";

type PreBriefInput = z.input<typeof PreBriefSchema>;

// ---------------------------------------------------------------------------
// Elin A. - catch-it-early. A tracked mole is growing and LDL is drifting up.
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
        { source: "skin.flagged[0].diameterMm", value: 4.8, scanDate: "2025-08-19" },
        { source: "skin.flagged[0].diameterMm", value: 5.2, scanDate: "2026-08-27" },
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
      summary:
        "LDL rose from 3.2 to 3.4 mmol/L, continuing a slow climb since 2023 (2.9 mmol/L).",
      provenance: [
        { source: "blood.ldl", value: 3.2, scanDate: "2025-08-19" },
        { source: "blood.ldl", value: 3.4, scanDate: "2026-08-27" },
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
        { source: "wearables.hrv", value: 48, scanDate: "2025-08-19" },
        { source: "wearables.hrv", value: 49, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "elin-d4",
      metric: "Blood pressure",
      previousValue: "118/76",
      currentValue: "120/78",
      unit: "mmHg",
      direction: "up",
      valence: "neutral",
      summary: "Blood pressure ticked up to 120/78 mmHg, still within a healthy range.",
      provenance: [
        { source: "heart.bpSystolic", value: 118, scanDate: "2025-08-19" },
        { source: "heart.bpSystolic", value: 120, scanDate: "2026-08-27" },
        { source: "heart.bpDiastolic", value: 78, scanDate: "2026-08-27" },
      ],
    },
  ],
  findings: [
    {
      id: "elin-f1",
      title: "Tracked mole enlarging",
      rationale:
        "The left shoulder-blade mole increased 0.4 mm in diameter over 12 months (4.8 to 5.2 mm). Border and pigmentation remain regular, but the growth rate warrants dermoscopy and a shorter recall interval.",
      riskTier: "elevated",
      provenance: [
        { source: "skin.flagged[0].diameterMm", value: 5.2, scanDate: "2026-08-27" },
        { source: "skin.flagged[0].changeMm", value: 0.4, scanDate: "2026-08-27" },
        { source: "skin.flagged[0].diameterMm", value: 4.8, scanDate: "2025-08-19" },
      ],
    },
    {
      id: "elin-f2",
      title: "LDL cholesterol trending up",
      rationale:
        "LDL has risen at every visit since 2023 (2.9 to 3.4 mmol/L). HDL is stable at 1.6 and CRP is low at 0.9 mg/L, so overall cardiovascular risk stays low, but the trajectory is worth addressing with diet before it needs medication.",
      riskTier: "watch",
      provenance: [
        { source: "blood.ldl", value: 2.9, scanDate: "2023-08-10" },
        { source: "blood.ldl", value: 3.2, scanDate: "2025-08-19" },
        { source: "blood.ldl", value: 3.4, scanDate: "2026-08-27" },
        { source: "blood.hdl", value: 1.6, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "elin-f3",
      title: "Fasting glucose at upper-normal",
      rationale:
        "Fasting glucose is 5.2 mmol/L and HbA1c 35 mmol/mol, both within normal limits but at the higher end and slowly rising. No action needed now; recheck at the next visit.",
      riskTier: "watch",
      provenance: [
        { source: "blood.fastingGlucose", value: 5.2, scanDate: "2026-08-27" },
        { source: "blood.hba1c", value: 35, scanDate: "2026-08-27" },
      ],
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
// Marcus B. - invisible risk. First visit, so no deltas. One connected story.
// ---------------------------------------------------------------------------
const MARCUS_B: PreBriefInput = {
  memberId: "marcus-b",
  headline:
    "First visit. Elevated visceral fat and borderline blood pressure stand out for discussion.",
  deltas: [],
  findings: [
    {
      id: "marcus-f1",
      title: "Visceral fat well above target",
      rationale:
        "Visceral fat index is 14, against a target under 10. This is the largest modifiable risk factor in the scan and links directly to the blood-pressure and lipid findings below.",
      riskTier: "elevated",
      provenance: [
        { source: "body.visceralFatIndex", value: 14, scanDate: "2026-08-27" },
        { source: "body.bodyFatPct", value: 30, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "marcus-f2",
      title: "Stage 1 hypertension",
      rationale:
        "Blood pressure is 138/89 mmHg with arterial stiffness of 9.6 m/s, above the expected range for age. This is a single reading and needs home monitoring to confirm, but the stiffness measure makes a real trend likely.",
      riskTier: "elevated",
      provenance: [
        { source: "heart.bpSystolic", value: 138, scanDate: "2026-08-27" },
        { source: "heart.bpDiastolic", value: 89, scanDate: "2026-08-27" },
        { source: "heart.arterialStiffness", value: 9.6, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "marcus-f3",
      title: "Low HDL with raised triglycerides",
      rationale:
        "HDL 1.05 mmol/L with triglycerides 2.1 mmol/L is a metabolic pattern that usually improves with the same changes that address visceral fat. LDL 3.7 mmol/L is borderline.",
      riskTier: "watch",
      provenance: [
        { source: "blood.hdl", value: 1.05, scanDate: "2026-08-27" },
        { source: "blood.triglycerides", value: 2.1, scanDate: "2026-08-27" },
        { source: "blood.ldl", value: 3.7, scanDate: "2026-08-27" },
      ],
    },
    {
      id: "marcus-f4",
      title: "HbA1c at the pre-diabetes threshold",
      rationale:
        "HbA1c 39 mmol/mol and fasting glucose 5.7 mmol/L sit at the top of the normal range. Worth an early recheck given the visceral fat finding.",
      riskTier: "watch",
      provenance: [
        { source: "blood.hba1c", value: 39, scanDate: "2026-08-27" },
        { source: "blood.fastingGlucose", value: 5.7, scanDate: "2026-08-27" },
      ],
    },
  ],
  talkingPoints: [
    "This is a first scan, so frame everything as a baseline, not a verdict. Marcus had no idea about the visceral fat or blood pressure.",
    "Connect the findings: visceral fat, blood pressure, HDL and glucose are one story, not four problems.",
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
// Priya C. - good news. Broad improvement, no findings to resolve. The tool is
// not only about alarms: the sign-off gate is satisfied from the start.
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
        { source: "body.visceralFatIndex", value: 11, scanDate: "2025-08-25" },
        { source: "body.visceralFatIndex", value: 6, scanDate: "2026-08-27" },
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
        { source: "blood.ldl", value: 3.9, scanDate: "2025-08-25" },
        { source: "blood.ldl", value: 3.0, scanDate: "2026-08-27" },
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
        { source: "heart.restingHr", value: 78, scanDate: "2025-08-25" },
        { source: "heart.restingHr", value: 64, scanDate: "2026-08-27" },
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
        { source: "blood.crp", value: 3.1, scanDate: "2025-08-25" },
        { source: "blood.crp", value: 0.9, scanDate: "2026-08-27" },
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
