import { emptyIntent } from "@/types/intent";
import type {
  Availability,
  Intent,
  OpeningWindow,
  Offer,
  Venue,
} from "@/types";

/**
 * Test factories.
 *
 * Tests build the exact shape they depend on and nothing more. Asserting
 * against the eight real venues in `mocks/venues.ts` would couple every test to
 * marketing copy — edit a tagline, break a ranking test. A factory forces each
 * test to state its own preconditions, which also makes each test readable in
 * isolation.
 *
 * Defaults are deliberately bland: a mid-band, mid-price, open venue with no
 * strong signal on any factor, so a test that cares about vibe sets only vibe.
 */

export const makeVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: "ven_test",
  businessId: "biz_test",
  verticalId: "club",
  name: "Test Room",
  tagline: "A room for testing.",
  description: "Nothing notable here by default.",
  neighbourhood: "Indiranagar",
  city: "Bengaluru",
  address: "1 Test Road, Indiranagar",
  location: { lat: 12.9716, lng: 77.5946 },
  media: [],
  amenities: [],
  openingHours: allWeek("21:00", "01:00"),
  attributes: { music_genre: ["House"] },
  capacity: 200,
  priceBand: 2,
  entryFee: null,
  agePolicy: "21+",
  dressCode: "None",
  brandColor: "#7c5cff",
  rating: 4.0,
  ratingCount: 500,
  verified: true,
  ...overrides,
});

export const makeAvailability = (
  overrides: Partial<Availability> = {},
): Availability => ({
  venueId: "ven_test",
  occupancyBand: "filling",
  occupancyPct: null,
  queueMinutes: 0,
  queueTrend: "steady",
  entryFee: null,
  nowPlaying: null,
  offersRemaining: 4,
  announcement: null,
  isOpen: true,
  // Fresh by default so the freshness factor never surprises a test that isn't
  // about freshness. Tests that care pass their own clock to `explainMatch`.
  updatedAt: "2026-01-01T22:00:00.000Z",
  updatedBy: "Door team",
  ...overrides,
});

export const makeIntent = (overrides: Partial<Intent> = {}): Intent => ({
  ...emptyIntent("club"),
  ...overrides,
});

export const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: "off_test",
  venueId: "ven_test",
  name: "Test table",
  description: "A table, for testing.",
  price: { amount: 500000, currency: "INR" },
  minGuests: 1,
  maxGuests: 8,
  perks: [],
  remaining: 3,
  totalInventory: 5,
  kind: "table",
  ...overrides,
});

/** Same window every day of the week. */
export const allWeek = (
  opensAt: string,
  closesAt: string,
): OpeningWindow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opensAt, closesAt }));

/** Open only on the given weekday numbers (0 = Sunday). */
export const openOnDays = (
  days: number[],
  opensAt: string,
  closesAt: string,
): OpeningWindow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    opensAt,
    closesAt,
    closed: !days.includes(day),
  }));
