import type {
  AnalyticsRange,
  AnalyticsSummary,
  Availability,
  Booking,
  Business,
  Intent,
  IntentTurn,
  Instant,
  Offer,
  OperationalNudge,
  Recommendation,
  RecommendationSet,
  Venue,
  VerticalId,
} from "@/types";

/**
 * Service contracts.
 *
 * The UI depends on these interfaces and never on an implementation. Today they
 * are satisfied by in-memory mocks; tomorrow by HTTP clients hitting a real
 * backend. Because every method is already async and cursor/範囲-shaped, the
 * swap is a container change (see `services/index.ts`) with zero component
 * edits — the whole point of paying this abstraction cost up front.
 *
 * Alternative considered: calling `fetch` from TanStack Query hooks directly.
 * Rejected — it spreads endpoint knowledge and response shaping across the
 * component tree, and makes the mock/real switch a find-and-replace.
 */

export interface IntentService {
  /**
   * Turn an utterance into structured intent. `previous` allows multi-turn
   * refinement ("actually make it eight of us") without re-stating everything.
   */
  interpret(input: {
    utterance: string;
    verticalId: VerticalId;
    previous?: Intent | null;
  }): Promise<IntentTurn>;
}

export interface RecommendationService {
  rank(input: { intent: Intent; limit?: number }): Promise<RecommendationSet>;
  similarTo(venueId: string, limit?: number): Promise<Recommendation[]>;
}

export interface VenueService {
  get(venueId: string): Promise<Venue | null>;
  list(verticalId: VerticalId): Promise<Venue[]>;
  offers(venueId: string): Promise<Offer[]>;
  update(venueId: string, patch: Partial<Venue>): Promise<Venue>;
}

export interface AvailabilityService {
  get(venueId: string): Promise<Availability>;
  getMany(venueIds: string[]): Promise<Record<string, Availability>>;
  update(venueId: string, patch: Partial<Availability>): Promise<Availability>;
}

export interface InstantService {
  listForVenue(venueId: string): Promise<Instant[]>;
  create(
    input: Omit<Instant, "id" | "createdAt" | "viewCount">,
  ): Promise<Instant>;
  remove(instantId: string): Promise<void>;
}

export interface AnalyticsService {
  summary(venueId: string, range: AnalyticsRange): Promise<AnalyticsSummary>;
  nudges(venueId: string): Promise<OperationalNudge[]>;
}

export interface BusinessService {
  current(): Promise<Business>;
}

export interface BookingService {
  hold(input: {
    venueId: string;
    offerId: string | null;
    guests: number;
    scheduledFor: string;
  }): Promise<Booking>;
  list(): Promise<Booking[]>;
}

export interface ServiceContainer {
  intent: IntentService;
  recommendations: RecommendationService;
  venues: VenueService;
  availability: AvailabilityService;
  instants: InstantService;
  analytics: AnalyticsService;
  business: BusinessService;
  bookings: BookingService;
}
