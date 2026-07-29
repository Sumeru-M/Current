import type { Availability } from "./live";
import type { Offer, Venue } from "./venue";

/**
 * A single, auditable reason a venue scored the way it did.
 *
 * Match score is never a bare number. Every point is attributable to a factor
 * with a human-readable claim, which means: the consumer sees *why*, the venue
 * owner sees *how to rank higher*, and support can explain a bad result. This
 * is the difference between an intent engine and a sorted list.
 */
export interface MatchFactor {
  id: string;
  label: string;
  /** Signed contribution to the final score, in score points. */
  contribution: number;
  /** Consumer-facing sentence fragment. */
  claim: string;
  polarity: "positive" | "neutral" | "negative";
}

export interface MatchExplanation {
  /** 0–100, derived — never authored directly. */
  score: number;
  factors: MatchFactor[];
  /** The single strongest line, shown on the card. */
  headline: string;
}

export interface TravelEstimate {
  distanceKm: number;
  minutes: number;
  mode: "drive" | "walk" | "transit";
}

export interface Recommendation {
  id: string;
  venue: Venue;
  availability: Availability;
  match: MatchExplanation;
  travel: TravelEstimate;
  /** Best-fitting offer for the stated group size, if any. */
  featuredOffer: Offer | null;
  /** Whether a live instant is currently playable for this venue. */
  hasInstant: boolean;
  rank: number;
}

export interface RecommendationSet {
  id: string;
  intentId: string;
  recommendations: Recommendation[];
  generatedAt: string;
  /** Venues considered before ranking — shown as "searched 47 venues". */
  consideredCount: number;
}
