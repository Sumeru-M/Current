import type {
  AnalyticsService,
  AvailabilityService,
  BookingService,
  BusinessService,
  RecommendationService,
  InstantService,
  VenueService,
} from "@/services/contracts";
import type {
  AnalyticsRange,
  AnalyticsSummary,
  Availability,
  Booking,
  Business,
  Intent,
  Instant,
  Offer,
  OperationalNudge,
  Recommendation,
  RecommendationBasis,
  RecommendationSet,
  Venue,
  VerticalId,
} from "@/types";
import { APP } from "@/config/app";
import { MOCK_BUSINESS } from "@/mocks/venues";
import { latency, nowIso, uid } from "@/mocks/runtime";
import { buildAnalytics, buildNudges } from "@/mocks/analytics";
import { nextOpening } from "@/lib/hours";
import { mockStore } from "./store";
import { estimateTravel, explainMatch } from "./ranking";

export class MockVenueService implements VenueService {
  async get(venueId: string): Promise<Venue | null> {
    await latency();
    return mockStore.getVenue(venueId);
  }

  async list(verticalId: VerticalId): Promise<Venue[]> {
    await latency();
    return mockStore.listVenues().filter((v) => v.verticalId === verticalId);
  }

  async offers(venueId: string): Promise<Offer[]> {
    await latency();
    return mockStore.getOffers(venueId);
  }

  async update(venueId: string, patch: Partial<Venue>): Promise<Venue> {
    await latency();
    return mockStore.updateVenue(venueId, patch);
  }
}

export class MockAvailabilityService implements AvailabilityService {
  async get(venueId: string): Promise<Availability> {
    await latency();
    return mockStore.getAvailability(venueId);
  }

  /**
   * Batch endpoint exists from day one. Fetching availability per card would be
   * N round-trips on a list screen — a mistake that is cheap to avoid now and
   * expensive to unpick once components are written against a single-get API.
   */
  async getMany(venueIds: string[]): Promise<Record<string, Availability>> {
    await latency();
    return Object.fromEntries(
      venueIds.map((id) => [id, mockStore.getAvailability(id)]),
    );
  }

  async update(
    venueId: string,
    patch: Partial<Availability>,
  ): Promise<Availability> {
    await latency();
    return mockStore.updateAvailability(venueId, patch);
  }
}

export class MockRecommendationService implements RecommendationService {
  async rank({
    intent,
    limit,
  }: {
    intent: Intent;
    limit?: number;
  }): Promise<RecommendationSet> {
    await latency();
    const candidates = mockStore
      .listVenues()
      .filter((venue) => venue.verticalId === intent.verticalId);

    const scored = candidates
      .map((venue) => {
        const availability = mockStore.getAvailability(venue.id);
        const offers = mockStore.getOffers(venue.id);
        const travel = estimateTravel(venue);
        const { match, featuredOffer } = explainMatch(
          intent,
          venue,
          availability,
          offers,
          travel,
        );
        return {
          id: uid("rec"),
          venue,
          availability,
          match,
          travel,
          featuredOffer,
          hasInstant: mockStore.listInstants(venue.id).length > 0,
          rank: 0,
        } satisfies Recommendation;
      })
      .sort((a, b) => b.match.score - a.match.score);

    /**
     * Open venues win outright. But when nothing is trading — a search at 3pm,
     * or a Monday when half the city is dark — returning an empty screen
     * answers a question nobody asked. Someone searching in the afternoon is
     * planning tonight, so we fall back to venues opening later and say so.
     *
     * The fallback is explicit in the payload (`basis`) rather than silently
     * blended, so the UI can be honest about which question it answered. A
     * closed venue never masquerades as an open one.
     */
    const openNow = scored.filter((rec) => rec.availability.isOpen);
    const basis: RecommendationBasis = openNow.length ? "open_now" : "opening_later";

    const pool =
      basis === "open_now"
        ? openNow
        : scored.filter((rec) => nextOpening(rec.venue) !== null);

    const ranked = pool
      .slice(0, limit ?? APP.maxRecommendations)
      .map((rec, index) => ({ ...rec, rank: index + 1 }));

    return {
      id: uid("recset"),
      intentId: intent.utterance,
      basis,
      recommendations: ranked,
      generatedAt: nowIso(),
      consideredCount: candidates.length,
    };
  }

  /**
   * "Similar to this" is the same ranker fed a synthetic intent derived from
   * the anchor venue. One scoring path, so similarity and search can never
   * drift apart in their idea of what "similar" means.
   */
  async similarTo(venueId: string, limit = 3): Promise<Recommendation[]> {
    await latency();
    const anchor = mockStore.getVenue(venueId);
    if (!anchor) return [];

    const syntheticIntent: Intent = {
      utterance: `Similar to ${anchor.name}`,
      verticalId: anchor.verticalId,
      groupSize: null,
      budgetPerPerson: null,
      vibes: ((anchor.attributes.music_genre as string[]) ?? []).slice(0, 2),
      timing: "tonight",
      maxQueueMinutes: null,
      maxTravelMinutes: null,
      neighbourhood: null,
      requirements: [],
      confidence: 0.6,
    };

    const set = await this.rank({ intent: syntheticIntent, limit: limit + 1 });
    return set.recommendations
      .filter((r) => r.venue.id !== venueId)
      .slice(0, limit);
  }
}

export class MockInstantService implements InstantService {
  async listForVenue(venueId: string): Promise<Instant[]> {
    await latency();
    return mockStore.listInstants(venueId);
  }

  async create(
    input: Omit<Instant, "id" | "createdAt" | "viewCount">,
  ): Promise<Instant> {
    await latency();
    return mockStore.addInstant({
      ...input,
      id: uid("instant"),
      createdAt: nowIso(),
      viewCount: 0,
    });
  }

  async remove(instantId: string): Promise<void> {
    await latency();
    mockStore.removeInstant(instantId);
  }
}

export class MockAnalyticsService implements AnalyticsService {
  async summary(
    venueId: string,
    range: AnalyticsRange,
  ): Promise<AnalyticsSummary> {
    await latency();
    return buildAnalytics(venueId, range, mockStore.getAvailability(venueId));
  }

  async nudges(venueId: string): Promise<OperationalNudge[]> {
    await latency();
    return buildNudges(venueId, mockStore.getAvailability(venueId));
  }
}

export class MockBusinessService implements BusinessService {
  async current(): Promise<Business> {
    await latency();
    return MOCK_BUSINESS;
  }
}

export class MockBookingService implements BookingService {
  private bookings: Booking[] = [];

  async hold(input: {
    venueId: string;
    offerId: string | null;
    guests: number;
    scheduledFor: string;
  }): Promise<Booking> {
    await latency();
    const booking: Booking = {
      id: uid("bkg"),
      ...input,
      status: "held",
      createdAt: nowIso(),
      reference: `AP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    };
    this.bookings = [booking, ...this.bookings];
    return booking;
  }

  async list(): Promise<Booking[]> {
    await latency();
    return this.bookings;
  }
}
