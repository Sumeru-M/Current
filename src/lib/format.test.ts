import { describe, expect, it } from "vitest";
import {
  formatDistance,
  formatDuration,
  formatMoney,
  getFreshness,
} from "./format";

describe("formatMoney", () => {
  it("renders null and zero as Free", () => {
    expect(formatMoney(null)).toBe("Free");
    expect(formatMoney({ amount: 0, currency: "INR" })).toBe("Free");
  });

  it("converts paise to rupees with no fractional noise", () => {
    // 300000 paise = ₹3,000.
    expect(formatMoney({ amount: 300000, currency: "INR" })).toBe("₹3,000");
  });

  it("uses compact notation for large amounts when asked", () => {
    const compact = formatMoney(
      { amount: 1_500_000, currency: "INR" },
      { compact: true },
    );
    expect(compact).not.toBe("₹15,000");
    expect(compact.length).toBeLessThan("₹15,000".length);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "now"],
    [45, "45 min"],
    [60, "1h"],
    [135, "2h 15m"],
  ])("formats %i min → %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("formatDistance", () => {
  it("uses metres under a kilometre", () => {
    expect(formatDistance(0.4)).toBe("400 m");
  });
  it("uses one decimal kilometre above", () => {
    expect(formatDistance(1.85)).toBe("1.9 km");
  });
});

describe("getFreshness — with an injected clock", () => {
  const updated = "2026-01-01T22:00:00.000Z";
  const at = (minsLater: number) =>
    new Date(new Date(updated).getTime() + minsLater * 60_000);

  it.each([
    [5, "live"],
    [30, "recent"],
    [90, "stale"],
    [200, "expired"],
  ] as const)("%i min old → %s", (mins, level) => {
    expect(getFreshness(updated, at(mins)).level).toBe(level);
  });
});
