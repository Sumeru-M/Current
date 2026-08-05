import type {
  Availability,
  Intent,
  MatchExplanation,
  MatchFactor,
  Offer,
  TravelEstimate,
  Venue,
} from "@/types";
import {
  REFERENCE_POINT,
  applyRequirements,
  haversineKm,
  scoreBudget,
  scoreCapacity,
  scoreFreshness,
  scoreGroup,
  scoreQuality,
  scoreQueue,
  scoreTravel,
  scoreVibe,
} from "./scoring";

/**
 * Ranking engine — composition layer.
 *
 * The individual scoring factors live in `scoring.ts` (pure, unit-tested); this
 * file wires them together. Scoring is additive over independent, named
 * factors, so `score` is a *derived* value that can always be decomposed:
 *
 *  - the consumer sees the top factor as the "why"
 *  - the venue sees which factor is costing them rank, and what to change
 *  - a weight can be A/B-ed without touching a component
 *
 * Alternative considered: a single opaque similarity score (embedding cosine).
 * Rejected for the MVP — it ranks well but explains nothing, and "why am I
 * ranked fourth?" is the first question every club owner asks in a pilot.
 * Long term the two compose: embeddings supply a `semanticFit` factor that
 * slots into the same array with its own weight and claim.
 */

export const estimateTravel = (venue: Venue): TravelEstimate => {
  const distanceKm = haversineKm(REFERENCE_POINT, venue.location);
  // Bengaluru night-time surface speed, empirically ~18km/h door to door.
  const minutes = Math.max(4, Math.round((distanceKm / 18) * 60) + 4);
  return { distanceKm, minutes, mode: distanceKm < 1.2 ? "walk" : "drive" };
};

/**
 * `at` is injectable (through `scoreFreshness`) so this whole function can be
 * made deterministic in a test — the freshness factor is otherwise the one
 * thing that reads the wall clock.
 */
export const explainMatch = (
  intent: Intent,
  venue: Venue,
  live: Availability,
  offers: Offer[],
  travel: TravelEstimate,
  at: Date = new Date(),
): { match: MatchExplanation; featuredOffer: Offer | null } => {
  const group = scoreGroup(intent, offers);

  const factors: MatchFactor[] = [
    scoreVibe(intent, venue),
    scoreBudget(intent, venue, live),
    scoreQueue(intent, live),
    scoreTravel(intent, travel, venue),
    scoreCapacity(live),
    group.factor,
    scoreFreshness(live, at),
    scoreQuality(venue),
    ...applyRequirements(intent, venue, live),
  ];

  // Closed venues are excluded upstream, not penalised — a closed room is never
  // an answer.
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
