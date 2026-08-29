import { afterEach, describe, expect, it, vi } from "vitest";

// Keep PreBriefGenerationError real; make generatePreBrief controllable.
vi.mock("@/lib/ai/prebrief", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/prebrief")>();
  return { ...actual, generatePreBrief: vi.fn() };
});

import { POST } from "@/app/api/demo/prebrief/route";
import { generatePreBrief } from "@/lib/ai/prebrief";
import { scanTemplate } from "./fixtures";
import type { PreBrief } from "@/lib/types";

const req = (body: unknown) =>
  new Request("http://test/api/demo/prebrief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// A model reply for the ephemeral "demo" member (single scan, id "demo").
// Level claims only, so the advisory judge is never invoked (no network).
const MOCK_PREBRIEF: PreBrief = {
  memberId: "demo",
  headline: "Single scan baseline.",
  deltas: [],
  findings: [
    {
      id: "d-f1",
      title: "LDL at watch level",
      rationale: "LDL is 3.0 mmol/L.",
      claim: { kind: "level", metric: "blood.ldl", value: 3.0, scanDate: "2026-08-29" },
      proposedTier: "watch",
      provenance: [{ metric: "blood.ldl", value: 3.0, scanDate: "2026-08-29" }],
      status: "unverified",
    },
    {
      id: "d-f2",
      title: "Fabricated glucose",
      rationale: "Fasting glucose is 9.9 mmol/L.",
      claim: { kind: "level", metric: "blood.fastingGlucose", value: 9.9, scanDate: "2026-08-29" },
      proposedTier: "elevated",
      provenance: [{ metric: "blood.fastingGlucose", value: 9.9, scanDate: "2026-08-29" }],
      status: "unverified",
    },
  ],
  talkingPoints: [],
  draftActionPlan: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(generatePreBrief).mockReset();
});

describe("POST /api/demo/prebrief", () => {
  it("a malformed scan is a 400 with the first Zod issue, even with no API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const bad = scanTemplate("2026-08-29") as Record<string, unknown>;
    delete bad.heart;

    const res = await POST(req(bad));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/heart/);
    expect(generatePreBrief).not.toHaveBeenCalled();
  });

  it("a valid scan with no API key is a 503, and never a sample", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(req(scanTemplate("2026-08-29")));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
    expect(generatePreBrief).not.toHaveBeenCalled();
  });

  it("a valid scan with a key generates live and reconciles against that scan", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.mocked(generatePreBrief).mockResolvedValueOnce(MOCK_PREBRIEF);

    const res = await POST(req(scanTemplate("2026-08-29")));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.generated).toBe(true);
    // d-f1 ties out and is shown; d-f2 (glucose 9.9 vs record 5.0) is rejected.
    expect(json.prebrief.findings).toHaveLength(1);
    expect(json.prebrief.findings[0].id).toBe("d-f1");
    // raw keeps the full model response, including the rejected finding.
    expect(json.raw.findings.map((f: { id: string }) => f.id)).toEqual(["d-f1", "d-f2"]);
    expect(json.rejected).toHaveLength(1);
    expect(json.rejected[0].kind).toBe("finding");
    expect(json.rejected[0].failedCheck.name).toBe("value-tie-out");

    // the ephemeral member is built from the uploaded scan alone
    expect(vi.mocked(generatePreBrief).mock.calls[0][0]).toMatchObject({
      id: "demo",
      firstVisit: true,
      scans: [{ date: "2026-08-29" }],
    });
  });

  it("a model failure maps to 502", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.mocked(generatePreBrief).mockRejectedValueOnce(new Error("model exploded"));
    const res = await POST(req(scanTemplate("2026-08-29")));
    expect(res.status).toBe(502);
  });
});
