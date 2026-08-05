import { describe, expect, it } from "vitest";
import { bandFromPct, headcountRange, OCCUPANCY_BANDS } from "./occupancy";

describe("bandFromPct — boundaries", () => {
  it.each([
    [0, "plenty"],
    [39, "plenty"],
    [40, "filling"],
    [69, "filling"],
    [70, "busy"],
    [89, "busy"],
    [90, "packed"],
    [100, "packed"],
  ] as const)("maps %i%% → %s", (pct, band) => {
    expect(bandFromPct(pct)).toBe(band);
  });
});

describe("headcountRange", () => {
  it("converts a band's percentage range into a headcount range", () => {
    // "busy" is 70–90% of a 400-capacity room → 280–360.
    expect(headcountRange("busy", 400)).toEqual({ from: 280, to: 360 });
  });

  it("caps the top of the packed range at capacity, never above", () => {
    const { to } = headcountRange("packed", 200);
    expect(to).toBeLessThanOrEqual(200);
  });
});

describe("OCCUPANCY_BANDS", () => {
  it("has non-overlapping, ascending ranges covering 0–100", () => {
    const ordered = ["plenty", "filling", "busy", "packed"] as const;
    let prevMax = 0;
    for (const id of ordered) {
      const [min, max] = OCCUPANCY_BANDS[id].range;
      expect(min).toBe(prevMax);
      expect(max).toBeGreaterThan(min);
      prevMax = max;
    }
    expect(prevMax).toBeGreaterThanOrEqual(100);
  });
});
