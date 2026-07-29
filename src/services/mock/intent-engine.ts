import {
  emptyIntent,
  intentSchema,
  type Intent,
  type IntentTurn,
} from "@/types/intent";
import type { IntentService } from "@/services/contracts";
import { latency, nowIso, uid } from "@/mocks/runtime";
import { formatMoney } from "@/lib/format";

/**
 * Mock intent engine.
 *
 * In production this is one call to an LLM with a JSON-schema-constrained
 * response, plus the same `intentSchema.parse` on the way out. Here it is a
 * deterministic slot filler. Why bother making a rules engine this careful when
 * it is throwaway? Because the *contract* is not throwaway: it proves the shape
 * of the data the model must return, it exercises every UI state (partial
 * intent, clarification, high confidence), and a pitch demo must never depend
 * on a network call to a model that might rate-limit mid-sentence.
 *
 * Trade-off accepted: this parser is brittle on phrasing it has never seen. It
 * degrades to low confidence and asks a clarifying question rather than
 * guessing — which is also the correct production behaviour.
 */

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  couple: 2,
  pair: 2,
  solo: 1,
  dozen: 12,
};

/** Vibe lexicon. Deliberately data, not code — grows without a deploy. */
const VIBE_LEXICON: { match: RegExp; vibe: string }[] = [
  { match: /\btechno\b/i, vibe: "Techno" },
  { match: /\bhouse\b/i, vibe: "House" },
  { match: /\bdeep house\b/i, vibe: "Deep House" },
  { match: /\bafro\b/i, vibe: "Afro House" },
  { match: /\bhip[- ]?hop\b/i, vibe: "Hip-Hop" },
  { match: /\br\s?&\s?b\b|\brnb\b/i, vibe: "R&B" },
  { match: /\bbollywood\b|\bdesi\b/i, vibe: "Bollywood" },
  { match: /\bcommercial\b|\bpop\b/i, vibe: "Commercial" },
  { match: /\bjazz\b|\bsoul\b/i, vibe: "Jazz" },
  { match: /\bdisco\b/i, vibe: "Disco" },
  { match: /\brooftop\b|\bopen[- ]air\b|\boutdoor/i, vibe: "Rooftop" },
  {
    match: /\bchill|\blow[- ]key\b|\brelax|\bquiet\b|\bconversation/i,
    vibe: "Low-key",
  },
  {
    match: /\bloud\b|\bwild\b|\bcrazy\b|\bmessy\b|\bgo hard\b/i,
    vibe: "High energy",
  },
  { match: /\bdance|\bdancing\b/i, vibe: "Dancefloor" },
  { match: /\bunderground\b|\bwarehouse\b|\braw\b/i, vibe: "Underground" },
  { match: /\bclassy\b|\bupscale\b|\bfancy\b|\bpremium\b/i, vibe: "Upscale" },
  { match: /\blive\b(?!\s?music venue)/i, vibe: "Live music" },
];

const REQUIREMENT_LEXICON: { match: RegExp; requirement: string }[] = [
  { match: /\bvip\b|\bbottle service\b|\btable\b/i, requirement: "VIP table" },
  {
    match: /\bno cover\b|\bfree entry\b|\bwithout cover\b/i,
    requirement: "No cover",
  },
  {
    match: /\bwheelchair|\bstep[- ]free|\baccessible\b/i,
    requirement: "Step-free access",
  },
  { match: /\bsmoking\b/i, requirement: "Smoking area" },
  { match: /\bparking\b|\bvalet\b/i, requirement: "Parking" },
  {
    match: /\bfood\b|\beat\b|\bkitchen\b|\bdinner\b/i,
    requirement: "Food served",
  },
  { match: /\bstag\b/i, requirement: "Stag entry" },
];

const NEIGHBOURHOODS = [
  "Indiranagar",
  "Koramangala",
  "Ulsoor",
  "MG Road",
  "Brigade Road",
  "Jayanagar",
  "Richmond Town",
  "Old Madras Road",
];

const parseGroupSize = (raw: string): number | null => {
  const text = normalise(raw);
  const explicit = text.match(
    /\b(\d{1,2})\s*(?:of us|people|friends|pax|heads|guys|girls)\b/i,
  );
  if (explicit) return clampGroup(Number(explicit[1]));

  const weAre = text.match(/\bwe(?:'|’)?re\s+(\d{1,2}|[a-z]+)\b/i);
  if (weAre) {
    const raw = weAre[1].toLowerCase();
    const n = Number(raw);
    if (!Number.isNaN(n)) return clampGroup(n);
    if (NUMBER_WORDS[raw]) return clampGroup(NUMBER_WORDS[raw]);
  }

  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (
      new RegExp(`\\b${word}\\b(?!\\s*(?:thousand|k\\b|hundred))`, "i").test(
        text,
      )
    ) {
      return clampGroup(value);
    }
  }

  if (/\b(just )?me\b|\balone\b|\bsolo\b/i.test(text)) return 1;
  if (/\bdate\b|\bmy (girlfriend|boyfriend|partner|wife|husband)\b/i.test(text))
    return 2;
  return null;
};

const clampGroup = (n: number): number | null =>
  Number.isFinite(n) && n >= 1 && n <= 60 ? Math.round(n) : null;

/**
 * Numbers are normalised before any pattern touches them.
 *
 * People type "₹3,000" and "1,500" constantly. Without this, `\d{3,6}` matches
 * the "000" *after* the comma and the engine silently reads a ₹3,000 budget as
 * ₹0 — which then reads as "Free" in the UI and quietly ranks the cheapest
 * venue first. A wrong answer delivered confidently is the worst failure mode
 * an intent engine has, so digit grouping is stripped up front, once.
 */
const normalise = (text: string): string =>
  text.replace(/(\d),(?=\d{3}\b)/g, "$1");

/** Returns budget per person in minor units (paise). */
const parseBudget = (raw: string, groupSize: number | null): number | null => {
  const text = normalise(raw);
  const kMatch = text.match(/(?:₹|rs\.?\s?|inr\s?)?(\d{1,3}(?:\.\d)?)\s?k\b/i);
  const plain = text.match(/(?:₹|rs\.?\s?|inr\s?)\s?(\d{3,6})/i);
  const bare = text.match(
    /\b(\d{3,6})\s*(?:budget|each|per head|a head|pp)\b/i,
  );

  let rupees: number | null = null;
  if (kMatch) rupees = Math.round(Number(kMatch[1]) * 1000);
  else if (plain) rupees = Number(plain[1]);
  else if (bare) rupees = Number(bare[1]);

  if (rupees === null) {
    if (/\bcheap\b|\bbudget\b|\baffordable\b|\bbroke\b/i.test(text))
      return 80000;
    if (/\bsplurge\b|\bno budget\b|\bmoney no object\b|\bballer\b/i.test(text))
      return 600000;
    return null;
  }

  // "₹3000 total for six of us" → divide. Default assumption is per person,
  // which is how people actually speak about going out.
  const isTotal = /\b(total|between us|altogether|for (?:all of )?us)\b/i.test(
    text,
  );
  if (isTotal && groupSize && groupSize > 1) {
    rupees = Math.round(rupees / groupSize);
  }
  return rupees * 100;
};

const parseTiming = (text: string): Intent["timing"] => {
  if (/\bright now\b|\bnow\b|\basap\b|\bimmediately\b/i.test(text))
    return "now";
  if (/\blater tonight\b|\bafter midnight\b|\blate\b/i.test(text))
    return "later_tonight";
  if (/\btonight\b|\bthis evening\b|\btoday\b/i.test(text)) return "tonight";
  if (/\bweekend\b|\bsaturday\b|\bfriday\b|\bsunday\b/i.test(text))
    return "weekend";
  if (/\bnext week\b|\bplanning\b|\bsometime\b/i.test(text)) return "planning";
  return null;
};

const parseQueue = (text: string): number | null => {
  const explicit = text.match(
    /\b(?:under|less than|max|no more than)\s*(\d{1,3})\s*(?:min|minute)/i,
  );
  if (explicit) return Number(explicit[1]);
  if (
    /\bno (?:long )?queue|\bno wait|\bno line|\bskip the queue|\bstraight in\b/i.test(
      text,
    )
  )
    return 10;
  if (/\bshort queue\b|\bquick entry\b/i.test(text)) return 20;
  return null;
};

const parseTravel = (text: string): number | null => {
  const explicit = text.match(
    /\b(?:within|under|less than)\s*(\d{1,3})\s*(?:min|minute)s?\s*(?:away|drive|from)/i,
  );
  if (explicit) return Number(explicit[1]);
  if (
    /\bnearby\b|\bclose by\b|\bwalking distance\b|\bround the corner\b/i.test(
      text,
    )
  )
    return 12;
  return null;
};

const parseList = <T>(
  text: string,
  lexicon: { match: RegExp; value: T }[],
): T[] => {
  const out: T[] = [];
  for (const entry of lexicon) {
    if (entry.match.test(text) && !out.includes(entry.value))
      out.push(entry.value);
  }
  return out;
};

/**
 * Confidence = how much of the decision space we have actually pinned down.
 * Weighted because not all slots matter equally: knowing the vibe changes the
 * result set far more than knowing the neighbourhood.
 */
const scoreConfidence = (intent: Intent): number => {
  const weights: [boolean, number][] = [
    [intent.vibes.length > 0, 0.32],
    [intent.groupSize !== null, 0.22],
    [intent.budgetPerPerson !== null, 0.2],
    [intent.timing !== null, 0.12],
    [intent.maxQueueMinutes !== null, 0.07],
    [intent.neighbourhood !== null, 0.04],
    [intent.requirements.length > 0, 0.03],
  ];
  return Number(
    weights
      .reduce((sum, [present, weight]) => sum + (present ? weight : 0), 0)
      .toFixed(2),
  );
};

/** Declarative read-back. Never a question, never chatty. */
const buildUnderstanding = (intent: Intent): string => {
  const parts: string[] = [];
  if (intent.groupSize) {
    parts.push(
      intent.groupSize === 1 ? "Just you" : `${intent.groupSize} of you`,
    );
  }
  if (intent.vibes.length)
    parts.push(intent.vibes.slice(0, 2).join(" + ").toLowerCase());
  if (intent.budgetPerPerson !== null) {
    parts.push(
      `under ${formatMoney({ amount: intent.budgetPerPerson, currency: "INR" })} each`,
    );
  }
  if (intent.maxQueueMinutes !== null)
    parts.push(`max ${intent.maxQueueMinutes} min wait`);
  if (intent.neighbourhood) parts.push(`around ${intent.neighbourhood}`);
  if (!parts.length) return "Reading the room…";
  return `${parts.join(", ").replace(/^./, (c) => c.toUpperCase())}.`;
};

/**
 * Ask at most one question, and only when the missing slot would materially
 * change the ranking. Chatbots ask three questions; concierges ask one.
 */
const buildClarification = (intent: Intent): IntentTurn["clarification"] => {
  if (intent.confidence >= 0.5) return null;

  if (!intent.vibes.length) {
    return {
      slot: "vibes",
      question: "What should the room feel like?",
      options: [
        {
          label: "Dancefloor",
          patch: { vibes: ["Dancefloor", "High energy"] },
        },
        { label: "Low-key", patch: { vibes: ["Low-key"] } },
        { label: "Rooftop", patch: { vibes: ["Rooftop"] } },
        { label: "Underground", patch: { vibes: ["Underground", "Techno"] } },
      ],
    };
  }
  if (intent.groupSize === null) {
    return {
      slot: "groupSize",
      question: "How many of you?",
      options: [
        { label: "Just me", patch: { groupSize: 1 } },
        { label: "2", patch: { groupSize: 2 } },
        { label: "4", patch: { groupSize: 4 } },
        { label: "6+", patch: { groupSize: 6 } },
      ],
    };
  }
  return {
    slot: "budgetPerPerson",
    question: "Roughly what per person?",
    options: [
      { label: "Under ₹1,000", patch: { budgetPerPerson: 100000 } },
      { label: "₹1,000–2,500", patch: { budgetPerPerson: 250000 } },
      { label: "₹2,500–5,000", patch: { budgetPerPerson: 500000 } },
      { label: "No limit", patch: { budgetPerPerson: 1000000 } },
    ],
  };
};

const mergeUnique = (a: string[], b: string[]): string[] =>
  Array.from(new Set([...a, ...b])).slice(0, 8);

export class MockIntentService implements IntentService {
  async interpret({
    utterance,
    verticalId,
    previous,
  }: {
    utterance: string;
    verticalId: string;
    previous?: Intent | null;
  }): Promise<IntentTurn> {
    await latency();

    const text = utterance.trim();
    const base = previous ?? emptyIntent(verticalId, text);

    const groupSize = parseGroupSize(text) ?? base.groupSize;
    const budget = parseBudget(text, groupSize) ?? base.budgetPerPerson;
    const vibes = mergeUnique(
      base.vibes,
      parseList(
        text,
        VIBE_LEXICON.map((v) => ({ match: v.match, value: v.vibe })),
      ),
    );
    const requirements = mergeUnique(
      base.requirements,
      parseList(
        text,
        REQUIREMENT_LEXICON.map((r) => ({
          match: r.match,
          value: r.requirement,
        })),
      ),
    );
    const neighbourhood =
      NEIGHBOURHOODS.find((n) =>
        new RegExp(n.replace(/\s/g, "\\s?"), "i").test(text),
      ) ?? base.neighbourhood;

    const draft: Intent = {
      ...base,
      utterance: text || base.utterance,
      verticalId,
      groupSize,
      budgetPerPerson: budget,
      vibes,
      requirements,
      neighbourhood,
      timing: parseTiming(text) ?? base.timing,
      maxQueueMinutes: parseQueue(text) ?? base.maxQueueMinutes,
      maxTravelMinutes: parseTravel(text) ?? base.maxTravelMinutes,
      confidence: 0,
    };

    // Parse at the boundary, exactly as we will with real model output.
    const intent = intentSchema.parse({
      ...draft,
      confidence: scoreConfidence(draft),
    });

    return {
      id: uid("turn"),
      intent,
      understanding: buildUnderstanding(intent),
      clarification: buildClarification(intent),
      createdAt: nowIso(),
    };
  }
}
