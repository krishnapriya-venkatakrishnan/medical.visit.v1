/**
 * Zod schemas - the single source of truth for everything that crosses the AI
 * boundary (non-negotiable #4: all model output is parsed as JSON and validated
 * with Zod before it is rendered; invalid output is rejected/retried, never shown).
 *
 * Rules for this module:
 *  - Every AI response shape is defined here first, then consumed elsewhere via
 *    `z.infer<typeof Schema>` - never hand-write the corresponding TS type.
 *  - Every AI-asserted finding must include a provenance reference to the exact
 *    data point(s) it derives from (non-negotiable #2). A finding schema without
 *    a required provenance field is a bug.
 *
 * Schemas are added in later stages.
 */

import { z } from "zod";

export const RiskTierSchema = z.enum(["good", "watch", "elevated", "priority"]);
