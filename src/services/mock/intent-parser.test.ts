import { describe, expect, it } from "vitest";
import { emptyIntent } from "@/types/intent";
import {
  buildClarification,
  parseBudget,
  parseGroupSize,
  parseIntent,
  parseQueue,
  parseTiming,
  parseNeighbourhood,
  scoreConfidence,
} from "./intent-parser";
import { makeIntent } from "@/mocks/factories";

describe("parseBudget", () => {
  /**
   * Bug 1 regression. `\d{3,6}` matched the "000" after the comma in "₹3,000"
   * and read the budget as ₹0 → "Free" → cheapest venue ranked first. Budget is
   * returned in paise, so ₹3,000 is 300000.
   */
  it("reads comma-grouped amounts, not the digits after the comma", () => {
    expect(parseBudget("under ₹3,000 each", null)).toBe(300000);
  });

  it.each([
    ["₹3,000 each", 300000],
    ["3,000 each", 300000],
    ["₹3000 budget", 300000],
    ["3k each", 300000],
    ["₹1,500 a head", 150000],
    ["rs 2000 per head", 200000],
  ])("parses %j → %i paise", (utterance, expected) => {
    expect(parseBudget(utterance, null)).toBe(expected);
  });

  /**
   * Voice input carries no ₹ symbol and no comma grouping — the exact form the
   * speech engine produces. Must still land on ₹3,000.
   */
  it("parses the spoken form with no symbol or comma", () => {
    expect(parseBudget("under 3000 each", null)).toBe(300000);
  });

  it("divides a stated total across the group", () => {
    // ₹3,000 total for six → ₹500 each → 50000 paise.
    expect(parseBudget("₹3000 total for six of us", 6)).toBe(50000);
  });

  it("treats an ambiguous amount as per-person, not total", () => {
    expect(parseBudget("around ₹2,000 each", 4)).toBe(200000);
  });

  it("maps fuzzy words to a sensible band", () => {
    expect(parseBudget("somewhere cheap", null)).toBe(80000);
    expect(parseBudget("let's splurge", null)).toBe(600000);
  });

  it("returns null when no budget is stated", () => {
    expect(parseBudget("techno tonight", null)).toBeNull();
  });
});

describe("parseGroupSize", () => {
  it.each([
    ["six of us", 6],
    ["we're 6", 6],
    ["we're four", 4],
    ["just me", 1],
    ["a couple", 2],
    ["date night", 2],
    ["8 people", 8],
  ])("parses %j → %i", (utterance, expected) => {
    expect(parseGroupSize(utterance)).toBe(expected);
  });

  /**
   * The number in "₹3,000" must never be read as a group size. This is the
   * cross-contamination the comma-normalise + word-boundary guards prevent.
   */
  it("does not read a budget figure as a group size", () => {
    expect(parseGroupSize("under ₹3,000 each")).toBeNull();
    expect(parseGroupSize("budget 3k")).toBeNull();
  });

  it("returns null when no size is stated", () => {
    expect(parseGroupSize("techno somewhere loud")).toBeNull();
  });
});

describe("parseQueue", () => {
  it("reads 'no long queues' as a 10-minute ceiling", () => {
    expect(parseQueue("somewhere with no long queues")).toBe(10);
  });
  it("reads an explicit limit", () => {
    expect(parseQueue("under 20 min wait")).toBe(20);
  });
  it("returns null when queue is not mentioned", () => {
    expect(parseQueue("techno tonight")).toBeNull();
  });
});

describe("parseTiming", () => {
  it.each([
    ["right now", "now"],
    ["tonight", "tonight"],
    ["later tonight", "later_tonight"],
    ["this weekend", "weekend"],
  ] as const)("parses %j → %s", (utterance, expected) => {
    expect(parseTiming(utterance)).toBe(expected);
  });
});

describe("parseNeighbourhood", () => {
  it("matches a known neighbourhood irrespective of spacing", () => {
    expect(parseNeighbourhood("close to Indiranagar")).toBe("Indiranagar");
    expect(parseNeighbourhood("near mg road")).toBe("MG Road");
  });
  it("returns null for an unknown area", () => {
    expect(parseNeighbourhood("somewhere in Whitefield")).toBeNull();
  });
});

describe("scoreConfidence", () => {
  it("rises as more decision-critical slots are filled", () => {
    const sparse = makeIntent({ vibes: [] });
    const rich = makeIntent({
      vibes: ["Techno"],
      groupSize: 6,
      budgetPerPerson: 300000,
      timing: "tonight",
    });
    expect(scoreConfidence(rich)).toBeGreaterThan(scoreConfidence(sparse));
  });
});

describe("buildClarification", () => {
  it("asks for the vibe first when nothing is known", () => {
    const clar = buildClarification(makeIntent({ confidence: 0 }));
    expect(clar?.slot).toBe("vibes");
  });

  it("asks nothing once confidence clears the bar", () => {
    const clar = buildClarification(makeIntent({ confidence: 0.7 }));
    expect(clar).toBeNull();
  });

  it("asks exactly one question, never a form", () => {
    const clar = buildClarification(
      makeIntent({ vibes: ["Techno"], groupSize: null, confidence: 0.32 }),
    );
    expect(clar?.slot).toBe("groupSize");
  });
});

describe("parseIntent (end to end, pure)", () => {
  it("fills every slot from one natural sentence", () => {
    const intent = parseIntent(
      "six of us, techno, under ₹3,000 each, no long queues",
      "club",
      emptyIntent("club"),
    );
    expect(intent.groupSize).toBe(6);
    expect(intent.vibes).toContain("Techno");
    expect(intent.budgetPerPerson).toBe(300000);
    expect(intent.maxQueueMinutes).toBe(10);
    expect(intent.confidence).toBeGreaterThan(0.5);
  });

  it("refines a prior intent instead of discarding it", () => {
    const first = parseIntent("techno tonight", "club", emptyIntent("club"));
    const second = parseIntent("actually make it eight of us", "club", first);
    expect(second.vibes).toContain("Techno"); // carried over
    expect(second.groupSize).toBe(8); // newly added
  });
});
