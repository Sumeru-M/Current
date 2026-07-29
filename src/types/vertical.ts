/**
 * Verticals
 * ---------
 * The platform is an intent engine, not a nightclub app. "Club" is data, never
 * a type. Everything downstream keys off `VerticalId`, so adding `restaurant`
 * or `escape_room` is a config entry plus a mock fixture — not a code branch.
 */
export const VERTICAL_IDS = [
  "club",
  "restaurant",
  "sports_venue",
  "comedy_club",
  "escape_room",
  "live_event",
  "concert",
  "experience",
  "tourism",
  "recreation",
  "wellness",
] as const;

export type VerticalId = (typeof VERTICAL_IDS)[number];

/**
 * Attributes are deliberately open-ended key/value pairs rather than a fixed
 * union. A club has `music_genre`; a restaurant has `cuisine`; an escape room
 * has `difficulty`. The renderer reads the vertical's attribute *schema* to
 * decide labels, icons and ordering — the Venue type itself never changes.
 */
export type AttributeKind = "tag" | "scalar" | "currency" | "duration" | "text";

export interface AttributeDescriptor {
  key: string;
  label: string;
  kind: AttributeKind;
  /** Shown on the compact recommendation card (space is scarce — max 4). */
  surfaceOnCard?: boolean;
}

export interface VerticalDescriptor {
  id: VerticalId;
  /** Singular consumer-facing noun, e.g. "club", "table", "court". */
  noun: string;
  nounPlural: string;
  /** What a "booking" is called in this vertical. */
  bookingNoun: string;
  /** Whether live occupancy/queue telemetry is meaningful here. */
  supportsLiveOccupancy: boolean;
  supportsQueue: boolean;
  supportsStories: boolean;
  attributes: AttributeDescriptor[];
  /** Seed prompts shown on an empty consumer canvas. */
  samplePrompts: string[];
  status: "live" | "planned";
}
