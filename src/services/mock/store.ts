import type { Availability, Instant, Offer, Venue } from "@/types";
import { bandFromPct } from "@/config/occupancy";
import { isOpenNow } from "@/lib/hours";
import { MOCK_OFFERS, MOCK_VENUES } from "@/mocks/venues";
import {
  createRng,
  hashString,
  minutesAgo,
  minutesFromNow,
} from "@/mocks/runtime";

/**
 * In-memory mock store.
 *
 * A module singleton, held on the client. This is what makes the demo feel like
 * a product rather than a slideshow: a change made in the business portal is
 * visible in the consumer app on the next poll, because both read the same
 * store. In production this module is deleted and the HTTP services take over —
 * nothing else knows the difference.
 *
 * Trade-off: state resets on hard refresh. Accepted deliberately — persisting
 * to localStorage would mean a demo could start from a colleague's half-edited
 * state, which is worse than a known-good reset. Saved venues *are* persisted,
 * because that is user data rather than simulation state.
 */

type Listener = () => void;

class MockStore {
  private venues = new Map<string, Venue>();
  private availability = new Map<string, Availability>();
  private instants = new Map<string, Instant[]>();
  private offers = new Map<string, Offer[]>();
  private listeners = new Set<Listener>();

  constructor() {
    for (const venue of MOCK_VENUES) {
      this.venues.set(venue.id, venue);
      this.availability.set(venue.id, seedAvailability(venue));
      this.offers.set(
        venue.id,
        MOCK_OFFERS.filter((o) => o.venueId === venue.id),
      );
    }
    this.instants.set("ven_obsidian", [
      seedInstant(
        "ven_obsidian",
        "Kohra just went b2b. Room is full.",
        18,
        "#ff4d5e",
        ["#2a0d12", "#0b0b0f"],
        "video",
      ),
      seedInstant(
        "ven_obsidian",
        "Doors open, first record on.",
        95,
        "#7c5cff",
        ["#150b2b", "#08080a"],
        "image",
      ),
    ]);
    this.instants.set("ven_halcyon", [
      seedInstant(
        "ven_halcyon",
        "Canopy open, sunset set starting.",
        42,
        "#4da3ff",
        ["#0d1c2b", "#08080a"],
        "video",
      ),
    ]);
    this.instants.set("ven_pulse", [
      seedInstant(
        "ven_pulse",
        "Two mezzanine tables left tonight.",
        8,
        "#ff5cc8",
        ["#2b0f24", "#0a0a0c"],
        "image",
      ),
    ]);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  listVenues(): Venue[] {
    return [...this.venues.values()];
  }

  getVenue(id: string): Venue | null {
    return this.venues.get(id) ?? null;
  }

  updateVenue(id: string, patch: Partial<Venue>): Venue {
    const current = this.venues.get(id);
    if (!current) throw new Error(`Unknown venue ${id}`);
    const next = { ...current, ...patch };
    this.venues.set(id, next);
    this.emit();
    return next;
  }

  getOffers(venueId: string): Offer[] {
    return this.offers.get(venueId) ?? [];
  }

  /**
   * Availability drifts between explicit updates so the demo never looks
   * frozen, but drift is bounded and derived from the venue id + current
   * minute — deterministic within a minute, organic across an evening.
   */
  getAvailability(venueId: string): Availability {
    const base = this.availability.get(venueId);
    if (!base) throw new Error(`Unknown venue ${venueId}`);
    return applyDrift(base);
  }

  updateAvailability(
    venueId: string,
    patch: Partial<Availability>,
    actor = "You",
  ): Availability {
    const current = this.availability.get(venueId);
    if (!current) throw new Error(`Unknown venue ${venueId}`);
    const next: Availability = {
      ...current,
      ...patch,
      venueId,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
    this.availability.set(venueId, next);
    this.emit();
    return next;
  }

  /** Expiry is enforced on read — no sweeper job, no stale instant ever served. */
  listInstants(venueId: string): Instant[] {
    const all = this.instants.get(venueId) ?? [];
    const live = all.filter(
      (i) => new Date(i.expiresAt).getTime() > Date.now(),
    );
    if (live.length !== all.length) this.instants.set(venueId, live);
    return live;
  }

  addInstant(instant: Instant): Instant {
    const existing = this.instants.get(instant.venueId) ?? [];
    this.instants.set(instant.venueId, [instant, ...existing]);
    this.emit();
    return instant;
  }

  removeInstant(instantId: string): void {
    for (const [venueId, list] of this.instants.entries()) {
      const next = list.filter((i) => i.id !== instantId);
      if (next.length !== list.length) this.instants.set(venueId, next);
    }
    this.emit();
  }
}

/**
 * Seed telemetry from a stable hash of the venue id, shaped by the hour so an
 * afternoon demo shows "warming up" and a 1am demo shows "peaking".
 */
function seedAvailability(venue: Venue): Availability {
  const rng = createRng(hashString(venue.id));
  const hour = new Date().getHours();
  // 0 at 8pm, rising to 1 around 1am.
  const nightCurve = (() => {
    if (hour >= 20) return Math.min(1, (hour - 19) / 5);
    if (hour <= 3) return Math.max(0.35, 1 - hour / 5);
    return 0.25 + rng() * 0.2;
  })();

  const popularity = 0.5 + rng() * 0.5;
  const trueOccupancy = Math.round(
    Math.min(97, 18 + nightCurve * 70 * popularity + rng() * 12),
  );
  /**
   * Only some venues publish an exact figure — the ones running door-counting
   * hardware or a ticketed entry system. Everyone else taps a band. Seeding it
   * this way keeps us honest: every screen has to look finished when `pct` is
   * null, because in production most rows will be.
   */
  const reportsExactCount = hashString(venue.id) % 3 === 0;
  const queueMinutes = Math.round(
    Math.max(0, (trueOccupancy - 45) / 3.2) * (0.6 + rng() * 0.9),
  );
  const offers = MOCK_OFFERS.filter((o) => o.venueId === venue.id);

  return {
    venueId: venue.id,
    occupancyBand: bandFromPct(trueOccupancy),
    occupancyPct: reportsExactCount ? trueOccupancy : null,
    queueMinutes,
    queueTrend: rng() > 0.6 ? "rising" : rng() > 0.3 ? "steady" : "falling",
    entryFee: venue.entryFee,
    nowPlaying: (venue.attributes.resident_dj as string) ?? null,
    offersRemaining: offers.reduce(
      (sum, o) => sum + (o.kind === "table" ? o.remaining : 0),
      0,
    ),
    announcement: null,
    /**
     * Seeded from the venue's own published hours rather than hardcoded true.
     * A club owner opening the demo on a Tuesday and seeing their Friday-only
     * room listed as open loses the room — and the ranker already relies on
     * `isOpen` to exclude venues, so getting it right here is what makes
     * "we never send people to a closed door" an honest claim.
     */
    isOpen: isOpenNow(venue),
    updatedAt: minutesAgo(Math.round(3 + rng() * 50)),
    updatedBy: rng() > 0.5 ? "Door team" : "Floor manager",
  };
}

/** Bounded organic drift — ±3% occupancy, ±4 min queue, per minute of clock. */
function applyDrift(base: Availability): Availability {
  const minuteSeed = Math.floor(Date.now() / 60_000);
  const rng = createRng(hashString(base.venueId) + minuteSeed);
  /**
   * The band never drifts. It is a human judgement a venue published, and
   * silently reclassifying "Busy" as "Nearly full" behind their back would
   * make the portal show something they never said. Only the exact figure —
   * which comes from hardware — moves, and only inside its own band.
   */
  const occupancyPct =
    base.occupancyPct === null
      ? null
      : Math.max(
          0,
          Math.min(99, base.occupancyPct + Math.round((rng() - 0.5) * 4)),
        );
  const queueMinutes = Math.max(
    0,
    base.queueMinutes + Math.round((rng() - 0.5) * 8),
  );
  return { ...base, occupancyPct, queueMinutes };
}

function seedInstant(
  venueId: string,
  caption: string,
  ageMinutes: number,
  accent: string,
  gradient: [string, string],
  kind: "image" | "video",
): Instant {
  return {
    id: `instant_${venueId}_${ageMinutes}`,
    venueId,
    media: {
      kind,
      gradient,
      accent,
      // Seeded clips carry a plausible length so the viewer's progress bar and
      // the 10s cap are exercised without shipping video bytes in the repo.
      durationSeconds: kind === "video" ? 7 : undefined,
    },
    caption,
    createdAt: minutesAgo(ageMinutes),
    expiresAt: minutesFromNow(240 - ageMinutes),
    viewCount: 120 + Math.round(hashString(venueId + caption) % 900),
  };
}

/** Single instance for the lifetime of the tab. */
export const mockStore = new MockStore();
