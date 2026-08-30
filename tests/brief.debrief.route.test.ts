import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/debrief", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/debrief")>();
  return { ...actual, generateDebrief: vi.fn() };
});

import { POST } from "@/app/api/brief/debrief/route";
import { generateDebrief } from "@/lib/ai/debrief";
import type { Debrief } from "@/lib/types";

const req = (body: unknown) =>
  new Request("http://test/api/brief/debrief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const FINALISED = {
  memberId: "demo",
  headline: "First visit baseline.",
  deltas: [],
  findings: [
    {
      id: "f1",
      title: "Elevated blood pressure",
      rationale: "BP is 146/93 mmHg.",
      claim: { kind: "level", metric: "heart.bpSystolic", value: 146, scanDate: "2026-08-29" },
      proposedTier: "elevated",
      provenance: [{ metric: "heart.bpSystolic", value: 146, scanDate: "2026-08-29" }],
      status: "accepted",
    },
  ],
  talkingPoints: [],
  draftActionPlan: [],
};

const MOCK_DEBRIEF: Debrief = {
  memberId: "demo",
  greeting: "Hi there,",
  summary: "Thanks for coming in.",
  whatsGood: [],
  whatToWatch: ["Keep an eye on blood pressure."],
  actionPlan: [],
  closing: "See you at your next scan.",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(generateDebrief).mockReset();
});

describe("POST /api/brief/debrief", () => {
  it("a body that is not a finalised pre-brief is a 400", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const res = await POST(req({ memberId: "demo" }));
    expect(res.status).toBe(400);
    expect(generateDebrief).not.toHaveBeenCalled();
  });

  it("no API key is a 503, never a template", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(req(FINALISED));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
    expect(generateDebrief).not.toHaveBeenCalled();
  });

  it("with a key it drafts live", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.mocked(generateDebrief).mockResolvedValueOnce(MOCK_DEBRIEF);

    const res = await POST(req(FINALISED));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.generated).toBe(true);
    expect(json.debrief.greeting).toBe("Hi there,");
    expect(vi.mocked(generateDebrief).mock.calls[0][1]).toBe("there");
  });

  it("a model failure maps to 502", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.mocked(generateDebrief).mockRejectedValueOnce(new Error("boom"));
    const res = await POST(req(FINALISED));
    expect(res.status).toBe(502);
  });
});
