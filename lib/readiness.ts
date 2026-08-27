/**
 * Board readiness summary - the one-line headline and the flag count shown on
 * each Member Board card.
 *
 * STAGE 2: these are static placeholders. In Stage 4 they are replaced by a live
 * call to `GET/POST /api/prebrief`, which derives the headline and the count of
 * unresolved findings from the member's record via the Anthropic API, with
 * provenance on every finding. The headline is machine-generated, so it renders
 * in `--provisional` (periwinkle) on the card - the same "unverified AI" signal
 * used everywhere else in the app.
 */

export interface Readiness {
  /** Machine-drafted one-liner for the clinician. Always treated as provisional. */
  headline: string;
  /** Findings that will need the clinician to accept / edit / dismiss. */
  flagCount: number;
}

const PLACEHOLDER: Record<string, Readiness> = {
  "elin-a": {
    headline:
      "Broadly well. A tracked mole has grown since last visit and LDL is trending up.",
    flagCount: 2,
  },
  "marcus-b": {
    headline:
      "First visit. Elevated visceral fat and borderline blood pressure stand out for discussion.",
    flagCount: 2,
  },
  "priya-c": {
    headline:
      "Strong year. Cardiometabolic markers have improved across the board.",
    flagCount: 0,
  },
};

const FALLBACK: Readiness = {
  headline: "Pre-brief not yet generated.",
  flagCount: 0,
};

export function getReadiness(memberId: string): Readiness {
  return PLACEHOLDER[memberId] ?? FALLBACK;
}
