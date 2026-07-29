import type { Money } from "./venue";

/**
 * Occupancy band — the *primary* representation of how full a room is.
 *
 * Not a formatting layer over a percentage. The band is the source of truth and
 * the percentage is optional, because that inversion is the whole point: a door
 * manager asked for a number invents one, and an invented number poisons every
 * recommendation downstream. Asked to tap "Busy", they answer honestly.
 *
 * Consumers get what they actually need — confidence, not precision. Venues who
 * *do* run door-counting hardware can supply `occupancyPct` as well, and it is
 * shown as supporting detail.
 */
export type OccupancyBand = "plenty" | "filling" | "busy" | "packed";

/**
 * Availability — the live, perishable state of a venue.
 *
 * Deliberately separated from `Venue`. Venue is slow-moving editorial content
 * (cache it for hours, render it on the server, put it on a CDN). Availability
 * changes minute to minute and is polled on the client. Fusing the two would
 * force us to bust the venue cache every time a doorman updates a queue count.
 */
export interface Availability {
  venueId: string;
  /** How full the room is. Always present — this is what venues report. */
  occupancyBand: OccupancyBand;
  /**
   * Exact occupancy, 0–100. Null whenever the venue reported a band only,
   * which is the common case. Never render this as the headline, and never
   * assume it exists.
   */
  occupancyPct: number | null;
  queueMinutes: number;
  queueTrend: "rising" | "steady" | "falling";
  entryFee: Money | null;
  /** Vertical-agnostic "what's happening right now" line. */
  nowPlaying: string | null;
  offersRemaining: number;
  announcement: string | null;
  isOpen: boolean;
  updatedAt: string;
  /** Who last touched it — powers the staleness nudge in the business portal. */
  updatedBy: string | null;
}

/**
 * Instant — a short-lived photo or clip from inside the room, right now.
 *
 * The format is deliberately Instagram's, because it needs no explanation to
 * either side of the marketplace: venues already know how to shoot one, and
 * users already know to tap. Clips are capped at 10 seconds — long enough to
 * show a floor and a sound, short enough that a manager will actually post one
 * between door problems.
 */
export interface InstantMedia {
  kind: "image" | "video";
  /**
   * Object URL (mock) or CDN URL (production). Absent for the seeded demo
   * instants, which render as generated artwork from `gradient` + `accent`.
   */
  url?: string;
  gradient: [string, string];
  accent: string;
  /** Clip length. Images use the default dwell time. */
  durationSeconds?: number;
}

export interface Instant {
  id: string;
  venueId: string;
  media: InstantMedia;
  caption: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
}

/** Freshness is a first-class product concept, so it is a first-class type. */
export type FreshnessLevel = "live" | "recent" | "stale" | "expired";

export interface Freshness {
  level: FreshnessLevel;
  ageMinutes: number;
  label: string;
}
