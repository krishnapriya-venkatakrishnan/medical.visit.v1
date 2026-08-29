import { describe, it, expect } from "vitest";
import { reconcile, reconcileFindings } from "@/lib/reconcile";
import { deriveTier } from "@/lib/reference-ranges";
import type { Finding } from "@/lib/types";
import { record, scanTemplate, memberOf } from "./fixtures";
import { mkFinding } from "./helpers";

const prov = (metric: string, value: number | string, scanDate = "2026-01-01") => ({
  metric,
  value,
  scanDate,
});

function levelFinding(over: Partial<Finding> = {}): Finding {
  return mkFinding({
    id: "f",
    title: "t",
    rationale: "LDL is 3.6 mmol/L.",
    claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2026-01-01" },
    proposedTier: "watch",
    provenance: [prov("blood.ldl", 3.6)],
    ...over,
  });
}

describe("referential-integrity -> rejected (and short-circuits)", () => {
  it("metric path absent in the record", () => {
    const r = reconcile(
      levelFinding({
        claim: { kind: "level", metric: "blood.vitaminD", value: 1, scanDate: "2026-01-01" },
        provenance: [prov("blood.vitaminD", 1)],
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
    expect(r.checks).toHaveLength(1);
    expect(r.checks[0].name).toBe("referential-integrity");
  });

  it("scanDate absent in the record", () => {
    const r = reconcile(
      levelFinding({
        claim: { kind: "level", metric: "blood.ldl", value: 3.6, scanDate: "2099-01-01" },
        provenance: [prov("blood.ldl", 3.6, "2099-01-01")],
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
    expect(r.checks).toHaveLength(1);
  });

  it("array index out of range", () => {
    const r = reconcile(
      levelFinding({
        claim: { kind: "level", metric: "skin.flagged[9].diameterMm", value: 4.5, scanDate: "2026-01-01" },
        provenance: [prov("skin.flagged[9].diameterMm", 4.5)],
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
    expect(r.checks).toHaveLength(1);
  });

  it("claim's own metric/date missing even though provenance resolves", () => {
    const r = reconcile(
      levelFinding({
        // provenance resolves fine...
        provenance: [prov("blood.ldl", 3.6)],
        // ...but the claim points at a scan that does not exist
        claim: { kind: "level", metric: "blood.crp", value: 1.0, scanDate: "2050-01-01" },
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
    expect(r.checks).toHaveLength(1);
    expect(r.checks[0].name).toBe("referential-integrity");
  });
});

describe("value-tie-out -> rejected", () => {
  it("provenance value does not match the record", () => {
    const r = reconcile(levelFinding({ provenance: [prov("blood.ldl", 9.9)] }), record);
    expect(r.verdict).toBe("rejected");
    expect(r.checks.some((c) => !c.passed && c.name === "value-tie-out")).toBe(true);
  });

  it("level claim value does not match the record", () => {
    const r = reconcile(
      levelFinding({
        claim: { kind: "level", metric: "blood.ldl", value: 4.4, scanDate: "2026-01-01" },
        provenance: [prov("blood.ldl", 3.6)],
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
  });

  it("trend claim `from` does not match the record", () => {
    const r = reconcile(
      mkFinding({
        id: "f",
        title: "t",
        rationale: "LDL rose from 3.0 to 3.6 mmol/L.",
        claim: {
          kind: "trend",
          metric: "blood.ldl",
          from: 2.5,
          fromDate: "2025-01-01",
          to: 3.6,
          toDate: "2026-01-01",
          direction: "up",
        },
        proposedTier: "watch",
        provenance: [prov("blood.ldl", 3.0, "2025-01-01"), prov("blood.ldl", 3.6)],
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
  });

  it("trend claim `to` does not match the record", () => {
    const r = reconcile(
      mkFinding({
        id: "f",
        title: "t",
        rationale: "LDL rose from 3.0 to 3.6 mmol/L.",
        claim: {
          kind: "trend",
          metric: "blood.ldl",
          from: 3.0,
          fromDate: "2025-01-01",
          to: 9.9,
          toDate: "2026-01-01",
          direction: "up",
        },
        proposedTier: "watch",
        provenance: [prov("blood.ldl", 3.0, "2025-01-01"), prov("blood.ldl", 3.6)],
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
  });

  it("near-equal float ties out; exact match ties out", () => {
    const near = reconcile(
      levelFinding({
        claim: { kind: "level", metric: "blood.ldl", value: 3.60000001, scanDate: "2026-01-01" },
        provenance: [prov("blood.ldl", 3.60000001)],
      }),
      record,
    );
    expect(near.checks.some((c) => !c.passed && c.name === "value-tie-out")).toBe(false);

    const exact = reconcile(levelFinding(), record);
    expect(exact.verdict).toBe("grounded");
  });
});

describe("trend-consistency", () => {
  const trend = (direction: "up" | "down", metric = "blood.ldl", from = 3.0, to = 3.6): Finding =>
    mkFinding({
      id: "f",
      title: "t",
      rationale: "LDL moved over the year.",
      claim: { kind: "trend", metric, from, fromDate: "2025-01-01", to, toDate: "2026-01-01", direction },
      proposedTier: "watch",
      provenance: [prov(metric, from, "2025-01-01"), prov(metric, to)],
    });

  it("direction that matches the record passes", () => {
    const r = reconcile(trend("up"), record);
    expect(r.checks.find((c) => c.name === "trend-consistency")?.passed).toBe(true);
  });

  it("flipped direction is rejected", () => {
    expect(reconcile(trend("down"), record).verdict).toBe("rejected");
  });

  it("flat record with a claimed up/down trend is rejected", () => {
    // skin.molesTracked is 1 in both scans
    expect(reconcile(trend("up", "skin.molesTracked", 1, 1), record).verdict).toBe("rejected");
    expect(reconcile(trend("down", "skin.molesTracked", 1, 1), record).verdict).toBe("rejected");
  });
});

describe("tier-derivation -> flagged, never rejected", () => {
  it("derived tier equals the proposed tier -> grounded", () => {
    const r = reconcile(levelFinding({ proposedTier: "watch" }), record);
    expect(r.verdict).toBe("grounded");
  });

  it("over-escalation: record-derived watch, model says priority -> flagged, derivedTier watch", () => {
    const r = reconcile(
      levelFinding({
        rationale: "Visceral fat index is 11.",
        claim: { kind: "level", metric: "body.visceralFatIndex", value: 11, scanDate: "2026-01-01" },
        provenance: [prov("body.visceralFatIndex", 11)],
        proposedTier: "priority",
      }),
      record,
    );
    expect(r.verdict).toBe("flagged");
    expect(r.derivedTier).toBe("watch");
  });

  it("under-call: record-derived elevated, model says watch -> flagged, derivedTier elevated", () => {
    const s = scanTemplate("2026-01-01");
    s.body.visceralFatIndex = 15;
    const member = memberOf(s);
    const r = reconcile(
      levelFinding({
        rationale: "Visceral fat index is 15.",
        claim: { kind: "level", metric: "body.visceralFatIndex", value: 15, scanDate: "2026-01-01" },
        provenance: [prov("body.visceralFatIndex", 15)],
        proposedTier: "watch",
      }),
      member,
    );
    expect(r.verdict).toBe("flagged");
    expect(r.derivedTier).toBe("elevated");
  });

  it("deriveTier boundary: LDL exactly 4.0 is elevated", () => {
    expect(deriveTier("blood.ldl", 3.999)).toBe("watch");
    expect(deriveTier("blood.ldl", 4.0)).toBe("elevated");
    expect(deriveTier("blood.ldl", 4.001)).toBe("elevated");
  });

  it("deriveTier low-is-bad metric (HDL) bands correctly", () => {
    expect(deriveTier("blood.hdl", 1.5)).toBe("good");
    expect(deriveTier("blood.hdl", 1.3)).toBe("watch");
    expect(deriveTier("blood.hdl", 1.0)).toBe("elevated");
    expect(deriveTier("blood.hdl", 0.7)).toBe("priority");
  });

  it("metric with no reference range (wearables.hrv) -> soft-fail -> flagged", () => {
    const r = reconcile(
      levelFinding({
        rationale: "HRV is 45 ms.",
        claim: { kind: "level", metric: "wearables.hrv", value: 45, scanDate: "2025-01-01" },
        provenance: [prov("wearables.hrv", 45, "2025-01-01")],
        proposedTier: "watch",
      }),
      record,
    );
    expect(r.verdict).toBe("flagged");
    const tier = r.checks.find((c) => c.name === "tier-derivation");
    expect(tier?.passed).toBe(false);
    expect(tier?.severity).toBe("soft");
    expect(r.derivedTier).toBe("watch");
  });

  it("observation claim keeps the proposed tier and does not hard-fail", () => {
    const r = reconcile(
      mkFinding({
        id: "f",
        title: "t",
        rationale: "The tracked mole border looks irregular.",
        claim: {
          kind: "observation",
          metric: "skin.flagged[0].diameterMm",
          scanDate: "2026-01-01",
          note: "border irregular",
        },
        proposedTier: "elevated",
        provenance: [prov("skin.flagged[0].diameterMm", 4.5)],
      }),
      record,
    );
    expect(r.verdict).toBe("grounded");
    expect(r.derivedTier).toBe("elevated");
    expect(r.checks.find((c) => c.name === "tier-derivation")?.passed).toBe(true);
  });
});

describe("prose-coverage -> flagged, never rejected", () => {
  it("unbacked number in the prose", () => {
    const r = reconcile(
      levelFinding({ rationale: "LDL is 3.6 mmol/L, taken with an HbA1c of 37." }),
      record,
    );
    expect(r.verdict).toBe("flagged");
    expect(r.checks.find((c) => c.name === "prose-coverage")?.passed).toBe(false);
  });

  it("unbacked metric keyword (grip strength) with no provenance", () => {
    const r = reconcile(
      levelFinding({ rationale: "LDL is 3.6 mmol/L; grip strength also looks low." }),
      record,
    );
    expect(r.verdict).toBe("flagged");
  });

  it("a four-digit year is ignored", () => {
    const r = reconcile(
      levelFinding({ rationale: "LDL rose during 2026 to 3.6 mmol/L." }),
      record,
    );
    expect(r.verdict).toBe("grounded");
  });

  it("a single digit is ignored", () => {
    const r = reconcile(levelFinding({ rationale: "LDL is 3.6 mmol/L; 1 finding total." }), record);
    expect(r.verdict).toBe("grounded");
  });

  it("all numbers and keywords backed -> passes", () => {
    const r = reconcile(levelFinding(), record);
    expect(r.checks.find((c) => c.name === "prose-coverage")?.passed).toBe(true);
  });
});

describe("verdict precedence", () => {
  it("a hard fail plus a soft fail -> rejected (hard wins), both failing checks present", () => {
    const r = reconcile(
      levelFinding({
        rationale: "LDL is 4.4 with mystery grip strength.",
        claim: { kind: "level", metric: "blood.ldl", value: 4.4, scanDate: "2026-01-01" },
        provenance: [prov("blood.ldl", 4.4)], // != record 3.6 -> hard fail
        proposedTier: "priority", // deriveTier -> elevated -> soft fail
      }),
      record,
    );
    expect(r.verdict).toBe("rejected");
    expect(r.checks.some((c) => !c.passed && c.severity === "hard")).toBe(true);
    expect(r.checks.some((c) => !c.passed && c.severity === "soft")).toBe(true);
  });

  it("only soft fails -> flagged; all pass -> grounded", () => {
    expect(reconcile(levelFinding({ proposedTier: "priority" }), record).verdict).toBe("flagged");
    expect(reconcile(levelFinding(), record).verdict).toBe("grounded");
  });
});

describe("reconcileFindings", () => {
  it("an empty array yields empty buckets", () => {
    expect(reconcileFindings([], record)).toEqual({ clinical: [], rejected: [] });
  });
});
