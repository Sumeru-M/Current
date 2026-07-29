import type { AnalyticsRange, VerticalId } from "@/types";

/**
 * Centralised query keys.
 *
 * Hand-written key arrays scattered across hooks are the number one cause of
 * "why didn't the cache invalidate" bugs. One factory, hierarchically ordered,
 * means `invalidateQueries({ queryKey: qk.availability.all })` reliably catches
 * every dependent query.
 */
export const qk = {
  venues: {
    all: ["venues"] as const,
    list: (verticalId: VerticalId) => ["venues", "list", verticalId] as const,
    detail: (venueId: string) => ["venues", "detail", venueId] as const,
    offers: (venueId: string) => ["venues", "offers", venueId] as const,
  },
  availability: {
    all: ["availability"] as const,
    detail: (venueId: string) => ["availability", venueId] as const,
    many: (venueIds: string[]) =>
      ["availability", "many", [...venueIds].sort().join(",")] as const,
  },
  instants: {
    all: ["instants"] as const,
    forVenue: (venueId: string) => ["instants", venueId] as const,
  },
  recommendations: {
    all: ["recommendations"] as const,
    similar: (venueId: string) =>
      ["recommendations", "similar", venueId] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    summary: (venueId: string, range: AnalyticsRange) =>
      ["analytics", venueId, range] as const,
    nudges: (venueId: string) => ["analytics", "nudges", venueId] as const,
  },
  business: {
    current: ["business", "current"] as const,
  },
  bookings: {
    all: ["bookings"] as const,
  },
} as const;
