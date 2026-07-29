import type { VerticalId } from "./vertical";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Money {
  /** Minor units (paise) to avoid float drift. Formatting is a UI concern. */
  amount: number;
  currency: "INR" | "USD" | "AED" | "GBP";
}

export interface MediaAsset {
  id: string;
  kind: "image" | "video";
  /**
   * Demo builds render deterministic CSS artwork from `gradient` + `accent`
   * instead of fetching bytes. Production sets `url` and the same component
   * swaps to <Image> — nothing else changes.
   */
  url?: string;
  gradient: [string, string];
  accent: string;
  alt: string;
  width: number;
  height: number;
}

export interface OpeningWindow {
  /** 0 = Sunday, matching Date#getDay so no translation layer is needed. */
  day: number;
  opensAt: string;
  closesAt: string;
  closed?: boolean;
}

/**
 * Business = the commercial account (who signs the contract, who logs in).
 * Venue = a physical place that account operates.
 * A single Business may own many Venues across many verticals — this split is
 * what lets a hospitality group manage a club and a restaurant in one portal.
 */
export interface Business {
  id: string;
  legalName: string;
  displayName: string;
  verticalIds: VerticalId[];
  venueIds: string[];
  plan: "pilot" | "growth" | "enterprise";
  contact: { email: string; phone: string; managerName: string };
}

export interface VenueAmenity {
  id: string;
  label: string;
}

export interface Venue {
  id: string;
  businessId: string;
  verticalId: VerticalId;
  name: string;
  /** One-line positioning statement, written by the venue. */
  tagline: string;
  description: string;
  neighbourhood: string;
  city: string;
  address: string;
  location: GeoPoint;
  media: MediaAsset[];
  amenities: VenueAmenity[];
  openingHours: OpeningWindow[];
  /** Vertical-specific values, keyed by AttributeDescriptor.key. */
  attributes: Record<string, string[] | string | number>;
  /**
   * Total legal capacity. Editorial, not telemetry — it changes when a licence
   * changes, not when a doorman blinks. Lives here so the live payload stays
   * small and cacheable, and so nobody has to re-enter it every shift.
   */
  capacity: number;
  priceBand: 1 | 2 | 3 | 4;
  entryFee: Money | null;
  agePolicy: string;
  dressCode: string;
  brandColor: string;
  rating: number;
  ratingCount: number;
  verified: boolean;
}

/** Bookable unit: a table, a court, a room, a slot. Vertical-agnostic. */
export interface Offer {
  id: string;
  venueId: string;
  name: string;
  description: string;
  price: Money;
  /** Minimum group size the offer serves. */
  minGuests: number;
  maxGuests: number;
  perks: string[];
  remaining: number;
  totalInventory: number;
  kind: "table" | "entry" | "package" | "slot" | "seat";
}
