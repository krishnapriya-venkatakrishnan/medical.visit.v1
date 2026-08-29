import { describe, it, expect, vi } from "vitest";
import { generateDebrief, DebriefGenerationError } from "@/lib/ai/debrief";
import { FinalisedPreBriefSchema } from "@/lib/schemas";
import type { CreateMessage } from "@/lib/ai/client";
import type { FinalisedPreBrief } from "@/lib/types";
import { textMessage } from "./helpers";

const finalised: FinalisedPreBrief = {
  memberId: "eval-member",
  headline: "Broadly steady.",
  deltas: [],
  findings: [],
  talkingPoints: [],
  draftActionPlan: [],
};

const debriefDraft = JSON.stringify({
  greeting: "Hi Elin,",
  summary: "Your results this visit were reassuring.",
  whatsGood: [],
  whatToWatch: [],
  actionPlan: [],
  closing: "See you at your next scan.",
});

const fake = (...texts: string[]) => {
  const fn = vi.fn<CreateMessage>();
  for (const t of texts) fn.mockResolvedValueOnce(textMessage(t));
  if (texts.length === 1) fn.mockResolvedValue(textMessage(texts[0]));
  return fn;
};

describe("generateDebrief plumbing (fake createMessage, no network)", () => {
  it("a valid reply is parsed into a schema-valid debrief with the real member id", async () => {
    const db = await generateDebrief(finalised, "Elin", fake(debriefDraft));
    expect(db.memberId).toBe("eval-member");
    expect(db.greeting).toBe("Hi Elin,");
  });

  it("invalid twice throws DebriefGenerationError", async () => {
    const fn = fake("not json");
    await expect(generateDebrief(finalised, "Elin", fn)).rejects.toBeInstanceOf(DebriefGenerationError);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

const VALID_FINDING = {
  id: "f1",
  title: "LDL trending up",
  rationale: "LDL is 3.6 mmol/L.",
  claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
  proposedTier: "watch",
  provenance: [{ metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" }],
};

const body = (status: string | undefined) => ({
  memberId: "eval-member",
  headline: "h",
  deltas: [],
  findings: [status === undefined ? VALID_FINDING : { ...VALID_FINDING, status }],
  talkingPoints: [],
  draftActionPlan: [],
});

describe("FinalisedPreBriefSchema", () => {
  it("accepts a body whose findings are all accepted or edited", () => {
    expect(FinalisedPreBriefSchema.safeParse(body("accepted")).success).toBe(true);
    expect(FinalisedPreBriefSchema.safeParse(body("edited")).success).toBe(true);
  });

  it("rejects a body containing an unverified or dismissed finding", () => {
    expect(FinalisedPreBriefSchema.safeParse(body("unverified")).success).toBe(false);
    expect(FinalisedPreBriefSchema.safeParse(body("dismissed")).success).toBe(false);
  });

  it("rejects a finding with no status at all", () => {
    expect(FinalisedPreBriefSchema.safeParse(body(undefined)).success).toBe(false);
  });
});
