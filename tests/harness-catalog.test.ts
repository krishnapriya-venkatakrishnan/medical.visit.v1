import { describe, expect, it } from "vitest";
import { runDeterministicCatalog } from "@/lib/harness-run";
import {
  adversarialCases,
  adversarialDeltas,
  cleanCases,
  cleanDeltas,
} from "@/evals/cases";

/**
 * The Harness suite tab renders `runDeterministicCatalog()` and shows a pass/fail
 * badge per case. This test runs the exact same function against the exact same
 * eval cases, so the tab cannot show a green that CI would call red.
 */
describe("Harness suite deterministic catalog", () => {
  const result = runDeterministicCatalog();

  it("covers every eval case, no more no less", () => {
    expect(result.cleanTotal).toBe(cleanCases.length + cleanDeltas.length);
    expect(result.adversarialTotal).toBe(adversarialCases.length + adversarialDeltas.length);
    expect(result.rows).toHaveLength(
      cleanCases.length + cleanDeltas.length + adversarialCases.length + adversarialDeltas.length,
    );
  });

  it("every clean case reconciles to grounded", () => {
    for (const row of result.rows.filter((r) => r.group === "clean")) {
      expect(row.actual, row.name).toBe("grounded");
      expect(row.pass, row.name).toBe(true);
    }
  });

  it("every adversarial case is caught and matches its labelled verdict", () => {
    for (const row of result.rows.filter((r) => r.group === "adversarial")) {
      expect(row.pass, row.name).toBe(true);
      expect(row.actual, row.name).toBe(row.expected);
      expect(row.matched, row.name).toBe(true);
    }
  });

  it("scores 100% catch, 0% false-rejection, all green", () => {
    expect(result.catchRate).toBe(100);
    expect(result.falseRejectionRate).toBe(0);
    expect(result.allGreen).toBe(true);
  });
});
