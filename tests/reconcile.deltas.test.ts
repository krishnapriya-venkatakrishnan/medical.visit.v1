import { describe, it, expect } from "vitest";
import { reconcileDelta, reconcileDeltas } from "@/lib/reconcile";
import type { Delta } from "@/lib/types";
import { record } from "./fixtures";

const ldl = (v: number, scanDate: string) => ({ metric: "blood.ldl", value: v, scanDate });

function delta(over: Partial<Delta> = {}): Delta {
  return {
    id: "d",
    metric: "LDL cholesterol",
    previousValue: 3.0,
    currentValue: 3.6,
    unit: "mmol/L",
    direction: "up",
    valence: "concern",
    summary: "LDL rose from 3.0 to 3.6 mmol/L.",
    provenance: [ldl(3.0, "2025-01-01"), ldl(3.6, "2026-01-01")],
    ...over,
  };
}

describe("reconcileDelta", () => {
  it("clean delta: provenance ties out, displayed values backed -> grounded", () => {
    expect(reconcileDelta(delta(), record).verdict).toBe("grounded");
  });

  it("provenance value does not match the record -> rejected", () => {
    const r = reconcileDelta(
      delta({ provenance: [ldl(3.0, "2025-01-01"), ldl(9.9, "2026-01-01")] }),
      record,
    );
    expect(r.verdict).toBe("rejected");
  });

  it("currentValue not backed by any provenance entry -> rejected", () => {
    // the planted sample shape (elin-d4): provenance ties, but the shown number does not
    const r = reconcileDelta(delta({ currentValue: 4.5 }), record);
    expect(r.verdict).toBe("rejected");
    expect(r.checks.some((c) => !c.passed && c.name === "displayed-value-backing")).toBe(true);
  });

  it("previousValue not backed by a separate entry (direction up) -> rejected", () => {
    expect(reconcileDelta(delta({ previousValue: 2.0 }), record).verdict).toBe("rejected");
  });

  it('direction "unchanged" with previousValue !== currentValue and previousValue unbacked -> rejected', () => {
    const r = reconcileDelta(
      delta({
        direction: "unchanged",
        previousValue: 3.0,
        currentValue: 3.6,
        provenance: [ldl(3.6, "2026-01-01")], // only the current value is backed
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
    expect(r.checks.some((c) => !c.passed && c.name === "displayed-value-backing")).toBe(true);
  });

  it('direction "unchanged" with previousValue === currentValue -> grounded', () => {
    const r = reconcileDelta(
      delta({
        direction: "unchanged",
        previousValue: 3.6,
        currentValue: 3.6,
        provenance: [ldl(3.6, "2026-01-01")],
      }),
      record,
    );
    expect(r.verdict).toBe("grounded");
  });
});

describe("reconcileDeltas", () => {
  it("an empty array yields empty buckets", () => {
    expect(reconcileDeltas([], record)).toEqual({ grounded: [], rejected: [] });
  });
});
