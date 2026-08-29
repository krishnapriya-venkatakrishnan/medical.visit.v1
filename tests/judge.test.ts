import { describe, it, expect, vi, afterEach } from "vitest";
import { judgeObservation } from "@/lib/ai/judge";
import type { CreateMessage } from "@/lib/ai/client";
import type { Claim } from "@/lib/types";
import { record } from "./fixtures";
import { textMessage } from "./helpers";

const OBSERVATION: Claim = {
  kind: "observation",
  metric: "skin.flagged[0].diameterMm",
  scanDate: "2026-01-01",
  note: "border looks irregular",
};

const fake = (text: string) => vi.fn<CreateMessage>().mockResolvedValue(textMessage(text));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("judgeObservation (fake createMessage, no network)", () => {
  it('a "not supported" verdict returns passed:false (downgrades grounded -> flagged)', async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const c = await judgeObservation(
      OBSERVATION,
      record,
      fake('{"supported": false, "reason": "the border is regular in the record"}'),
    );
    expect(c.name).toBe("observation-judge");
    expect(c.severity).toBe("soft");
    expect(c.passed).toBe(false);
  });

  it('a "supported" verdict returns passed:true and never flips flagged back to grounded', async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const c = await judgeObservation(
      OBSERVATION,
      record,
      fake('{"supported": true, "reason": "consistent with the note"}'),
    );
    expect(c.passed).toBe(true);
    // The route only ever moves grounded -> flagged on a failing check; a passing
    // check (passed:true) can never upgrade a verdict.
  });

  it("an unreadable verdict fails open (passed:true, ignored)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const wrongShape = await judgeObservation(OBSERVATION, record, fake('{"foo": 1}'));
    expect(wrongShape.passed).toBe(true);

    const notJson = await judgeObservation(OBSERVATION, record, fake("total nonsense, not json"));
    expect(notJson.passed).toBe(true);
  });

  it("with no API key the judge is skipped and the fake is never called", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const fn = fake('{"supported": false, "reason": "x"}');
    const c = await judgeObservation(OBSERVATION, record, fn);
    expect(c.passed).toBe(true);
    expect(c.detail).toMatch(/no API key/i);
    expect(fn).not.toHaveBeenCalled();
  });

  it("a non-observation claim is a no-op and the fake is never called", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const level: Claim = { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" };
    const fn = fake('{"supported": false, "reason": "x"}');
    const c = await judgeObservation(level, record, fn);
    expect(c.passed).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });
});
