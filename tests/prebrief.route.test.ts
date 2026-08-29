import { describe, it, expect, vi, afterEach } from "vitest";
import Anthropic from "@anthropic-ai/sdk";

// Keep PreBriefGenerationError real; make generatePreBrief controllable.
vi.mock("@/lib/ai/prebrief", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/prebrief")>();
  return { ...actual, generatePreBrief: vi.fn() };
});

import { POST } from "@/app/api/prebrief/route";
import { generatePreBrief } from "@/lib/ai/prebrief";

const req = (body: unknown) =>
  new Request("http://test/api/prebrief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(generatePreBrief).mockReset();
});

describe("POST /api/prebrief", () => {
  it("a body with no memberId is a 400", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("an unknown member is a 404", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(req({ memberId: "no-such-member" }));
    expect(res.status).toBe(404);
  });

  it("with no API key it serves the reconciled sample, generated:false, tray populated", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(req({ memberId: "elin-a" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.generated).toBe(false);
    expect(json.rejected.length).toBeGreaterThanOrEqual(1);
    expect(json.rejected.some((r: { kind: string }) => r.kind === "finding")).toBe(true);
    expect(json.rejected.some((r: { kind: string }) => r.kind === "delta")).toBe(true);
    // grounded/flagged only make it into prebrief.findings
    expect(Array.isArray(json.prebrief.findings)).toBe(true);
  });

  it("a rate-limit error from the model maps to 429", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.mocked(generatePreBrief).mockRejectedValueOnce(
      new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers()),
    );
    const res = await POST(req({ memberId: "elin-a" }));
    expect(res.status).toBe(429);
  });

  it("any other generation error maps to 502", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.mocked(generatePreBrief).mockRejectedValueOnce(new Error("something broke"));
    const res = await POST(req({ memberId: "elin-a" }));
    expect(res.status).toBe(502);
  });
});
