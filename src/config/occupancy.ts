import type { OccupancyBand } from "@/types/live";

/**
 * Occupancy vocabulary.
 *
 * One definition of what each band means, shared by the venue reporting it and
 * the customer reading it. Two definitions — a "Busy" that means something
 * different on each side — is how a live-data product loses trust.
 *
 * `representativePct` exists only so the ranker has a scalar when a venue
 * reports no exact figure. It is never displayed.
 */
export interface OccupancyBandDescriptor {
  id: OccupancyBand;
  /** Consumer-facing. Answers "should we go?" without arithmetic. */
  label: string;
  /** Business-facing helper, shown under the button in the live console. */
  hint: string;
  /** Inclusive lower bound / exclusive upper bound, for deriving from a %. */
  range: [number, number];
  representativePct: number;
  tone: "positive" | "neutral" | "caution" | "critical";
}

export const OCCUPANCY_BANDS: Record<OccupancyBand, OccupancyBandDescriptor> = {
  plenty: {
    id: "plenty",
    label: "Plenty of space",
    hint: "Walk in, sit down, room to move",
    range: [0, 40],
    representativePct: 25,
    tone: "positive",
  },
  filling: {
    id: "filling",
    label: "Filling up",
    hint: "Floor is building, still easy to get in",
    range: [40, 70],
    representativePct: 55,
    tone: "positive",
  },
  busy: {
    id: "busy",
    label: "Busy",
    hint: "Good energy, tight at the bar",
    range: [70, 90],
    representativePct: 80,
    tone: "caution",
  },
  packed: {
    id: "packed",
    label: "Nearly full",
    hint: "One in, one out territory",
    range: [90, 101],
    representativePct: 95,
    tone: "critical",
  },
};

/** Ordered for display — the live console renders these as four large targets. */
export const OCCUPANCY_BAND_ORDER: OccupancyBand[] = [
  "plenty",
  "filling",
  "busy",
  "packed",
];

export const getBand = (band: OccupancyBand): OccupancyBandDescriptor =>
  OCCUPANCY_BANDS[band];

/** Used when seeding fixtures or ingesting a venue's door-counting hardware. */
export const bandFromPct = (pct: number): OccupancyBand =>
  OCCUPANCY_BAND_ORDER.find((id) => {
    const [min, max] = OCCUPANCY_BANDS[id].range;
    return pct >= min && pct < max;
  }) ?? "packed";

/**
 * Headcount estimate from a band, for venues that publish a total capacity.
 * Expressed as a range, never a point estimate — implying we know there are
 * exactly 312 people inside when a manager tapped "Busy" would be a lie.
 */
export const headcountRange = (
  band: OccupancyBand,
  capacity: number,
): { from: number; to: number } => {
  const [min, max] = OCCUPANCY_BANDS[band].range;
  return {
    from: Math.round((min / 100) * capacity),
    to: Math.round((Math.min(max, 100) / 100) * capacity),
  };
};
