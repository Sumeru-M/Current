import { describe, expect, it } from "vitest";
import {
  scoreBudget,
  scoreCapacity,
  scoreQueue,
  vibeAffinity,
} from "./scoring";
import { explainMatch, estimateTravel } from "./ranking";
import {
  makeAvailability,
  makeIntent,
  makeOffer,
  makeVenue,
} from "@/mocks/factories";
import type { OccupancyBand } from "@/types";

describe("vibeAffinity — positional, not boolean (Bug 2)", () => {
  /**
   * A ₹200 student bar listing "Techno" third once outranked a dedicated techno
   * club, because matching was a boolean substring test. First-listed genre
   * must score strictly higher than third-listed.
   */
  it("scores a headline genre above a buried one", () => {
    const dedicated = makeVenue({ attributes: { music_genre: ["Techno", "Minimal"] } });
    const incidental = makeVenue({
      attributes: { music_genre: ["Commercial", "Pop", "Techno"] },
    });
    expect(vibeAffinity(dedicated, "Techno")).toBeGreaterThan(
      vibeAffinity(incidental, "Techno"),
    );
  });

  it("gives no credit when the vibe is absent entirely", () => {
    const venue = makeVenue({ attributes: { music_genre: ["Jazz"] } });
    expect(vibeAffinity(venue, "Techno")).toBe(0);
  });
});

describe("vibeAffinity — evidence beyond the genre list (Bug 3)", () => {
  /**
   * "Halcyon Rooftop" did not match a search for "rooftop" because the venue
   * name was not in the evidence set. The name is now soft evidence.
   */
  it("matches on the venue name", () => {
    const venue = makeVenue({
      name: "Halcyon Rooftop",
      attributes: { music_genre: ["Deep House"] },
    });
    expect(vibeAffinity(venue, "Rooftop")).toBeGreaterThan(0);
  });

  /**
   * Users say "rooftop"; venue copy says "terrace". The synonym table in
   * config/vibes.ts bridges the two.
   */
  it("matches a synonym in the description", () => {
    const venue = makeVenue({
      name: "Halcyon",
      description: "Fourteenth-floor terrace with a retractable canopy.",
      attributes: { music_genre: ["Deep House"] },
    });
    expect(vibeAffinity(venue, "Rooftop")).toBeGreaterThan(0);
  });
});

describe("scoreBudget — fit, not cheapness (Bug 4)", () => {
  /**
   * Someone who says ₹3,000 intends to spend near ₹3,000. A venue that uses
   * ~80% of the budget must not lose to one that uses ~20%.
   */
  it("scores a well-matched price at least as high as a much cheaper one", () => {
    const intent = makeIntent({ budgetPerPerson: 300000 }); // ₹3,000
    const wellMatched = makeVenue({ priceBand: 3 }); // ~₹2,600 base
    const dirtCheap = makeVenue({ priceBand: 1 }); // ~₹600 base
    const live = makeAvailability({ entryFee: null });

    expect(
      scoreBudget(intent, wellMatched, live).contribution,
    ).toBeGreaterThanOrEqual(scoreBudget(intent, dirtCheap, live).contribution);
  });

  it("penalises a venue well over the stated budget", () => {
    const intent = makeIntent({ budgetPerPerson: 60000 }); // ₹600
    const pricey = makeVenue({ priceBand: 4 }); // ~₹5,000 base
    expect(scoreBudget(intent, pricey, makeAvailability()).polarity).toBe(
      "negative",
    );
  });
});

describe("scoreCapacity — non-monotonic", () => {
  const scoreFor = (band: OccupancyBand) =>
    scoreCapacity(makeAvailability({ occupancyBand: band })).contribution;

  it("peaks at 'busy', below both empty and packed", () => {
    expect(scoreFor("busy")).toBeGreaterThan(scoreFor("plenty"));
    expect(scoreFor("busy")).toBeGreaterThan(scoreFor("packed"));
  });
});

describe("scoreQueue", () => {
  it("penalises a wait over the user's stated ceiling", () => {
    const intent = makeIntent({ maxQueueMinutes: 10 });
    const live = makeAvailability({ queueMinutes: 40 });
    expect(scoreQueue(intent, live).contribution).toBeLessThan(0);
  });

  it("rewards a wait comfortably inside the ceiling", () => {
    const intent = makeIntent({ maxQueueMinutes: 30 });
    const live = makeAvailability({ queueMinutes: 5 });
    expect(scoreQueue(intent, live).contribution).toBeGreaterThan(0);
  });
});

describe("explainMatch — composition invariants", () => {
  // Fixed clock 30 min after the venue's update → deterministic freshness.
  const at = new Date("2026-01-01T22:30:00.000Z");
  const build = () =>
    explainMatch(
      makeIntent({ vibes: ["Techno"], groupSize: 4, budgetPerPerson: 300000 }),
      makeVenue({ attributes: { music_genre: ["Techno"] } }),
      makeAvailability(),
      [makeOffer()],
      estimateTravel(makeVenue()),
      at,
    );

  it("clamps score to 0–100", () => {
    const { match } = build();
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
  });

  it("sorts factors by contribution, descending", () => {
    const { match } = build();
    const contributions = match.factors.map((f) => f.contribution);
    expect(contributions).toEqual([...contributions].sort((a, b) => b - a));
  });

  it("headlines the strongest positive factor", () => {
    const { match } = build();
    const topPositive = [...match.factors]
      .filter((f) => f.polarity === "positive")
      .sort((a, b) => b.contribution - a.contribution)[0];
    expect(match.headline).toBe(topPositive.claim);
  });

  it("is deterministic under a fixed clock", () => {
    expect(build().match.score).toBe(build().match.score);
  });
});
