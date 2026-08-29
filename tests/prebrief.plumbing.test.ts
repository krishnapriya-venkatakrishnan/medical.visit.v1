import { describe, it, expect, vi } from "vitest";
import { generatePreBrief, PreBriefGenerationError } from "@/lib/ai/prebrief";
import type { CreateMessage } from "@/lib/ai/client";
import { record } from "./fixtures";
import { textMessage } from "./helpers";

const VALID_FINDING = {
  id: "f1",
  title: "LDL trending up",
  rationale: "LDL is 3.6 mmol/L.",
  claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
  proposedTier: "watch",
  provenance: [{ metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" }],
};

const draft = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    memberId: "eval-member",
    headline: "Broadly steady.",
    deltas: [],
    findings: [],
    talkingPoints: [],
    draftActionPlan: [],
    ...over,
  });

const fake = (...texts: string[]) => {
  const fn = vi.fn<CreateMessage>();
  for (const t of texts) fn.mockResolvedValueOnce(textMessage(t));
  if (texts.length === 1) fn.mockResolvedValue(textMessage(texts[0]));
  return fn;
};

describe("generatePreBrief plumbing (fake createMessage, no network)", () => {
  it("valid JSON on the first try is parsed and returned", async () => {
    const fn = fake(draft());
    const pb = await generatePreBrief(record, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(pb.headline).toBe("Broadly steady.");
    expect(Array.isArray(pb.findings)).toBe(true);
  });

  it("the member id is forced to the real member even if the model echoes a wrong one", async () => {
    const pb = await generatePreBrief(record, fake(draft({ memberId: "SOME-OTHER-ID" })));
    expect(pb.memberId).toBe("eval-member");
  });

  it("invalid JSON then valid JSON returns; the fake is called exactly twice", async () => {
    const fn = fake("not json at all", draft());
    const pb = await generatePreBrief(record, fn);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(pb.memberId).toBe("eval-member");
  });

  it("invalid twice throws PreBriefGenerationError and returns nothing", async () => {
    const fn = fake("garbage");
    await expect(generatePreBrief(record, fn)).rejects.toBeInstanceOf(PreBriefGenerationError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a finding with no provenance is rejected by the schema (never returned)", async () => {
    const noProv = { ...VALID_FINDING, provenance: [] };
    const fn = fake(draft({ findings: [noProv] }));
    await expect(generatePreBrief(record, fn)).rejects.toBeInstanceOf(PreBriefGenerationError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clinician-only fields on a finding are dropped, not surfaced", async () => {
    const withClinicianFields = { ...VALID_FINDING, status: "accepted", clinicianEdit: "edited text" };
    const pb = await generatePreBrief(record, fake(draft({ findings: [withClinicianFields] })));
    expect(pb.findings).toHaveLength(1);
    expect(pb.findings[0].status).toBe("unverified");
    expect(pb.findings[0].clinicianEdit).toBeUndefined();
  });

  it("output wrapped in ```json fences is unwrapped and parsed", async () => {
    const fenced = "```json\n" + draft() + "\n```";
    const pb = await generatePreBrief(record, fake(fenced));
    expect(pb.headline).toBe("Broadly steady.");
  });
});
