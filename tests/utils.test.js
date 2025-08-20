import { describe, it, expect } from "vitest";
import {
  daysBetween,
  addInterval,
  monthlyEquivalent,
  dueColor,
  parseHue,
  packCircles,
} from "../src/lib/utils.js";

describe("utils", () => {
  it("daysBetween basic diff", () => {
    expect(daysBetween("2025-01-01", "2025-01-05")).toBe(4);
  });
  it("addInterval weekly/monthly/yearly/custom", () => {
    expect(addInterval("2025-01-01", "weekly")).toBe("2025-01-08");
    expect(addInterval("2025-01-31", "monthly") >= "2025-02-28").toBe(true);
    const y = addInterval("2024-02-29", "yearly");
    expect(y === "2025-02-28" || y.startsWith("2025-02")).toBe(true);
    expect(addInterval("2025-01-01", "custom", 10)).toBe("2025-01-11");
  });
  it("monthlyEquivalent conversions", () => {
    expect(Math.abs(monthlyEquivalent(10, "weekly") - 43.4524)).toBeLessThan(
      1e-6,
    );
    expect(Math.abs(monthlyEquivalent(120, "yearly") - 10)).toBeLessThan(1e-6);
    expect(Math.abs(monthlyEquivalent(10, "custom", 10) - 30)).toBeLessThan(
      1e-6,
    );
  });
  it("dueColor hue decreases near due date", () => {
    const hFar = parseHue(dueColor(30, 30));
    const hNear = parseHue(dueColor(1, 30));
    expect(hFar).toBeGreaterThan(hNear);
  });
  it("packCircles avoids overlaps", () => {
    const layout = [
      { id: "a", r: 40 },
      { id: "b", r: 35 },
      { id: "c", r: 28 },
      { id: "d", r: 24 },
      { id: "e", r: 20 },
    ];
    const pos = packCircles(layout, 400, 300, 0.5);
    // check pairwise distances
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const A = { ...layout[i], ...pos.get(layout[i].id) };
        const B = { ...layout[j], ...pos.get(layout[j].id) };
        const dist = Math.hypot(A.x - B.x, A.y - B.y);
        expect(dist + 0.25).toBeGreaterThanOrEqual(A.r + B.r); // epsilon
      }
    }
  });
});
