/**
 * Synthetic member fixtures - the only data this prototype ever uses
 * (non-negotiable #3: synthetic data only, no real personal or health data).
 * Loaded server-side, per spec section 5.
 *
 * The three records give the demo its range:
 *  - Elin A.  (returning) mostly well, but a tracked mole grew 0.4mm and LDL is
 *             creeping up. The catch-it-early case.
 *  - Marcus B. (first visit) high visceral fat and borderline BP he had no idea
 *             about. The invisible-risk case. One scan only, so no deltas.
 *  - Priya C. (returning) broad improvement after a year of better habits. The
 *             good-news, reinforce-it case, so the tool is not only about alarms.
 *
 * Every record is parsed against `MemberSchema` at module load, so a malformed
 * fixture fails fast and loudly rather than surfacing as a runtime surprise.
 */

import "server-only";

import { MemberSchema } from "@/lib/schemas";
import type { Member, Scan } from "@/lib/types";
import elinA from "./elin-a.json";
import marcusB from "./marcus-b.json";
import priyaC from "./priya-c.json";

const MEMBERS: readonly Member[] = Object.freeze(
  [elinA, marcusB, priyaC].map((raw, i) => {
    const parsed = MemberSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Synthetic fixture ${i} is invalid:\n${JSON.stringify(parsed.error.format(), null, 2)}`,
      );
    }
    return parsed.data;
  }),
);

/** All members, in display order. */
export function getMembers(): readonly Member[] {
  return MEMBERS;
}

/** One member by id, or `undefined` if there is no such member. */
export function getMemberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

/** Today's scan for a member (the last entry; records run oldest to newest). */
export function getLatestScan(member: Member): Scan {
  return member.scans[member.scans.length - 1];
}

/** The scan before today's, or `undefined` for a first visit. */
export function getPreviousScan(member: Member): Scan | undefined {
  return member.scans.at(-2);
}
