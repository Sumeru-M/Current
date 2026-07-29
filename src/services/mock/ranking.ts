import type {
  Availability,
  Intent,
  MatchExplanation,
  MatchFactor,
  Offer,
  TravelEstimate,
  Venue,
} from "@/types";
import { formatMoney } from "@/lib/format";
import { getBand } from "@/config/occupancy";
import { vibeTerms } from "@/config/vibes";

/**
 * Ranking engine.
 *
 * Scoring is additive over independent, named factors. Every factor returns its
 * own contribution and a human sentence, so `score` is a *derived* value that
 * can always be decomposed. This is the core product asset:
 *
 *  - the consumer sees the top factor as the "why"
 *  - the venue sees which factor is costing them rank, and what to change
 *  - we can A/B a weight without touching a component
 *
 * Alternative considered: a single opaque similarity score (embedding cosine).
 * Rejected for the MVP — it ranks well but explains nothing, and "why am I
 * ranked fourth?" is the first question every club owner asks in a pilot.
 * Long term the two compose: embeddings supply a `semanticFit` factor that
 * slots into this same array with its own weight and claim.
 */

/** Weights sum to the maximum achievable score before penalties. */
const WEIGHTS = {
  vibe: 34,
  budget: 22,
  queue: 16,
  travel: 12,
  capacity: 10,
  group: 8,
  freshness: 6,
  quality: 6,
} as const;

const REFERENCE_POINT = { lat: 12.9716, lng: 77.5946 };

const haversineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const estimateTravel = (venue: Venue): TravelEstimate => {
  const distanceKm = haversineKm(REFERENCE_POINT, venue.location);
  // Bengaluru night-time surface speed, empirically ~18km/h door to door.
  const minutes = Math.max(4, Math.round((distanceKm / 18) * 60) + 4);
  return { distanceKm, minutes, mode: distanceKm < 1.2 ? "walk" : "drive" };
};

/** Typical per-person spend implied by price band, in minor units. */
const bandSpend: Record<Venue["priceBand"], number> = {
  1: 60000,
  2: 120000,
  3: 260000,
  4: 500000,
};

const factor = (
  id: string,
  label: string,
  contribution: number,
  claim: string,
  polarity: MatchFactor["polarity"] = "positive",
): MatchFactor => ({
  id,
  label,
  contribution: Number(contribution.toFixed(1)),
  claim,
  polarity,
});

/**
 * How strongly a venue is *identified* with a given vibe.
 *
 * Not a boolean. A room whose first listed genre is techno is a techno club; a
 * commercial bar that lists techno third is a bar that sometimes plays techno.
 * Scoring those identically produced a visibly wrong result in testing — a
 * ₹200 student bar outranked the city's dedicated techno room for "techno,
 * under ₹3,000" purely because it was cheaper.
 *
 * It also closes an obvious marketplace exploit: if every listed tag paid the
 * same, the winning strategy for any venue is to list every genre. Here,
 * diluting your tags dilutes your score on each of them.
 */
const vibeAffinity = (venue: Venue, vibe: string): number => {
  const terms = vibeTerms(vibe);
  const genres = ((venue.attributes.music_genre as string[]) ?? []).map((g) =>
    g.toLowerCase(),
  );

  const position = genres.findIndex((g) =>
    terms.some((term) => g.includes(term) || term.includes(g)),
  );
  if (position === 0) return 1;
  if (position === 1) return 0.75;
  if (position > 1) return 0.45;

  /**
   * Secondary evidence. The venue *name* belongs in here — "Halcyon Rooftop"
   * not matching a search for a rooftop was a real miss caught in testing, and
   * the name is often the most honest description a venue writes.
   */
  const soft = [
    venue.name.toLowerCase(),
    ...((venue.attributes.crowd as string[]) ?? []).map((c) => c.toLowerCase()),
    ...venue.amenities.map((a) => a.label.toLowerCase()),
    venue.tagline.toLowerCase(),
    venue.description.toLowerCase(),
  ].join(" ");

  return terms.some((term) => soft.includes(term)) ? 0.5 : 0;
};

const scoreVibe = (intent: Intent, venue: Venue): MatchFactor => {
  if (!intent.vibes.length) {
    return factor(
      "vibe",
      "Vibe",
      WEIGHTS.vibe * 0.5,
      "Broad match — tell us the sound to sharpen this",
      "neutral",
    );
  }

  const scored = intent.vibes.map((vibe) => ({
    vibe,
    affinity: vibeAffinity(venue, vibe),
  }));
  const hits = scored.filter((s) => s.affinity > 0);
  const strength =
    scored.reduce((sum, s) => sum + s.affinity, 0) / intent.vibes.length;

  if (!hits.length) {
    return factor(
      "vibe",
      "Vibe",
      0,
      `Plays ${(venue.attributes.music_genre as string[])?.[0] ?? "a different sound"}`,
      "negative",
    );
  }

  const labels = hits.map((h) => h.vibe);
  const isSignature = hits.every((h) => h.affinity >= 0.75);

  return factor(
    "vibe",
    "Vibe",
    WEIGHTS.vibe * strength,
    hits.length === intent.vibes.length && isSignature
      ? `Built for ${labels.join(" and ").toLowerCase()} — it's what they're known for`
      : isSignature
        ? `${labels.join(" and ")} is their main sound`
        : `${labels.join(" and ")} features in the mix`,
  );
};

const scoreBudget = (
  intent: Intent,
  venue: Venue,
  live: Availability,
): MatchFactor => {
  const entry = live.entryFee?.amount ?? venue.entryFee?.amount ?? 0;
  const expected = bandSpend[venue.priceBand] + entry;
  if (intent.budgetPerPerson === null) {
    return factor(
      "budget",
      "Budget",
      WEIGHTS.budget * 0.5,
      `About ${formatMoney({ amount: expected, currency: "INR" })} a head`,
      "neutral",
    );
  }
  const ratio = expected / intent.budgetPerPerson;

  /**
   * Budget is a *fit* score, not a cheapness score.
   *
   * Peak marks go to venues that use most of the stated budget without
   * breaking it. Someone who says "₹3,000 each" has decided to spend roughly
   * ₹3,000 — ranking the ₹400 option top because it is cheapest answers a
   * question they did not ask, and it systematically buries the premium venues
   * who are the ones paying us.
   */
  if (ratio >= 0.55 && ratio <= 1) {
    return factor(
      "budget",
      "Budget",
      WEIGHTS.budget,
      `Right at your ${formatMoney({ amount: intent.budgetPerPerson, currency: "INR" })} a head`,
    );
  }
  if (ratio < 0.55) {
    return factor(
      "budget",
      "Budget",
      WEIGHTS.budget * 0.8,
      `Comfortably under at ~${formatMoney({ amount: expected, currency: "INR" })} each`,
    );
  }
  if (ratio <= 1.25) {
    return factor(
      "budget",
      "Budget",
      WEIGHTS.budget * 0.35,
      `Slightly over at ~${formatMoney({ amount: expected, currency: "INR" })} each`,
      "neutral",
    );
  }
  return factor(
    "budget",
    "Budget",
    -8,
    `Runs ~${formatMoney({ amount: expected, currency: "INR" })} a head`,
    "negative",
  );
};

const scoreQueue = (intent: Intent, live: Availability): MatchFactor => {
  const wait = live.queueMinutes;
  const cap = intent.maxQueueMinutes;
  if (cap === null) {
    if (wait <= 5)
      return factor(
        "queue",
        "Queue",
        WEIGHTS.queue * 0.8,
        "Walking straight in right now",
      );
    if (wait <= 20)
      return factor(
        "queue",
        "Queue",
        WEIGHTS.queue * 0.5,
        `${wait} min at the door`,
        "neutral",
      );
    return factor(
      "queue",
      "Queue",
      WEIGHTS.queue * 0.15,
      `${wait} min queue`,
      "neutral",
    );
  }
  if (wait <= cap * 0.5)
    return factor(
      "queue",
      "Queue",
      WEIGHTS.queue,
      `Only ${wait} min wait — you asked for under ${cap}`,
    );
  if (wait <= cap)
    return factor(
      "queue",
      "Queue",
      WEIGHTS.queue * 0.7,
      `${wait} min wait, inside your limit`,
    );
  return factor(
    "queue",
    "Queue",
    -10,
    `${wait} min queue — over your ${cap} min limit`,
    "negative",
  );
};

const scoreTravel = (
  intent: Intent,
  travel: TravelEstimate,
  venue: Venue,
): MatchFactor => {
  if (intent.neighbourhood && venue.neighbourhood === intent.neighbourhood) {
    return factor(
      "travel",
      "Distance",
      WEIGHTS.travel,
      `In ${venue.neighbourhood}, where you asked`,
    );
  }
  const cap = intent.maxTravelMinutes;
  if (cap !== null && travel.minutes > cap) {
    return factor(
      "travel",
      "Distance",
      -6,
      `${travel.minutes} min away — further than you wanted`,
      "negative",
    );
  }
  const decay = Math.max(0, 1 - travel.minutes / 45);
  return factor(
    "travel",
    "Distance",
    WEIGHTS.travel * decay,
    `${travel.minutes} min from you in ${venue.neighbourhood}`,
    decay > 0.4 ? "positive" : "neutral",
  );
};

/**
 * Occupancy is non-monotonic and this is the most opinionated call in the file:
 * an empty room is a bad night out, and so is a dangerously full one. Peak
 * desirability sits at "Busy". A naive "fuller = more popular = rank higher"
 * would send every group to the one venue already at capacity, which is bad for
 * the user *and* for the venue's door.
 *
 * Scored from the band, not a percentage — the band is what venues actually
 * report, and a ranker that depends on optional precision would quietly
 * down-rank every honest venue that doesn't run door-counting hardware.
 */
const scoreCapacity = (live: Availability): MatchFactor => {
  const band = getBand(live.occupancyBand);
  const weightByBand: Record<typeof live.occupancyBand, number> = {
    plenty: 0.3,
    filling: 0.75,
    busy: 1,
    packed: 0.4,
  };
  const claimByBand: Record<typeof live.occupancyBand, string> = {
    plenty: "Room to move — floor fills later",
    filling: "Filling up nicely right now",
    busy: "Busy — peak energy tonight",
    packed: "Nearly full, tight on space",
  };

  return factor(
    "capacity",
    "Room",
    WEIGHTS.capacity * weightByBand[live.occupancyBand],
    claimByBand[live.occupancyBand],
    band.tone === "critical" || live.occupancyBand === "plenty"
      ? "neutral"
      : "positive",
  );
};

const scoreGroup = (
  intent: Intent,
  offers: Offer[],
): { factor: MatchFactor; offer: Offer | null } => {
  const size = intent.groupSize;
  if (size === null) {
    return {
      factor: factor(
        "group",
        "Group",
        WEIGHTS.group * 0.5,
        "Fits most group sizes",
        "neutral",
      ),
      offer: null,
    };
  }
  const fits = offers
    .filter(
      (o) => o.remaining > 0 && size >= o.minGuests && size <= o.maxGuests,
    )
    .sort((a, b) => a.price.amount - b.price.amount);
  const best = fits.find((o) => o.kind === "table") ?? fits[0] ?? null;

  if (!best) {
    return {
      factor: factor(
        "group",
        "Group",
        -4,
        `Nothing held for ${size} right now`,
        "negative",
      ),
      offer: null,
    };
  }
  return {
    factor: factor(
      "group",
      "Group",
      WEIGHTS.group,
      best.kind === "table"
        ? `${best.name} still open for ${size}`
        : `Entry available for all ${size}`,
    ),
    offer: best,
  };
};

const scoreFreshness = (live: Availability): MatchFactor => {
  const ageMin = (Date.now() - new Date(live.updatedAt).getTime()) / 60_000;
  if (ageMin <= 15)
    return factor(
      "freshness",
      "Data",
      WEIGHTS.freshness,
      "Venue confirmed this minutes ago",
    );
  if (ageMin <= 45)
    return factor(
      "freshness",
      "Data",
      WEIGHTS.freshness * 0.5,
      "Updated within the hour",
      "neutral",
    );
  return factor("freshness", "Data", 0, "Not updated recently", "negative");
};

const scoreQuality = (venue: Venue): MatchFactor =>
  factor(
    "quality",
    "Reputation",
    WEIGHTS.quality * Math.min(1, Math.max(0, (venue.rating - 3.5) / 1.5)),
    `${venue.rating.toFixed(1)} from ${venue.ratingCount.toLocaleString("en-IN")} nights out`,
    venue.rating >= 4.3 ? "positive" : "neutral",
  );

const applyRequirements = (
  intent: Intent,
  venue: Venue,
  live: Availability,
): MatchFactor[] => {
  const out: MatchFactor[] = [];
  const amenities = venue.amenities.map((a) => a.label.toLowerCase()).join(" ");

  for (const requirement of intent.requirements) {
    const key = requirement.toLowerCase();
    if (key === "no cover") {
      const fee = live.entryFee?.amount ?? 0;
      out.push(
        fee === 0
          ? factor("req_cover", "No cover", 8, "No cover charge tonight")
          : factor(
              "req_cover",
              "No cover",
              -14,
              `Cover is ${formatMoney(live.entryFee)}`,
              "negative",
            ),
      );
    } else if (key === "vip table") {
      out.push(
        live.offersRemaining > 0
          ? factor("req_vip", "VIP", 7, `${live.offersRemaining} tables left`)
          : factor("req_vip", "VIP", -12, "Fully booked on tables", "negative"),
      );
    } else if (key === "step-free access") {
      out.push(
        amenities.includes("step-free") || amenities.includes("lift")
          ? factor("req_access", "Access", 7, "Step-free entry confirmed")
          : factor(
              "req_access",
              "Access",
              -16,
              "No step-free access listed",
              "negative",
            ),
      );
    } else if (amenities.includes(key.split(" ")[0])) {
      out.push(
        factor(`req_${key}`, requirement, 5, `${requirement} available`),
      );
    }
  }
  return out;
};

export const explainMatch = (
  intent: Intent,
  venue: Venue,
  live: Availability,
  offers: Offer[],
  travel: TravelEstimate,
): { match: MatchExplanation; featuredOffer: Offer | null } => {
  const group = scoreGroup(intent, offers);

  const factors: MatchFactor[] = [
    scoreVibe(intent, venue),
    scoreBudget(intent, venue, live),
    scoreQueue(intent, live),
    scoreTravel(intent, travel, venue),
    scoreCapacity(live),
    group.factor,
    scoreFreshness(live),
    scoreQuality(venue),
    ...applyRequirements(intent, venue, live),
  ];

  // Closed venues are excluded, not penalised — a closed room is never an answer.
  const raw = factors.reduce((sum, f) => sum + f.contribution, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const headline =
    [...factors]
      .filter((f) => f.polarity === "positive")
      .sort((a, b) => b.contribution - a.contribution)[0]?.claim ??
    factors[0].claim;

  return {
    match: {
      score,
      factors: factors.sort((a, b) => b.contribution - a.contribution),
      headline,
    },
    featuredOffer: group.offer,
  };
};
