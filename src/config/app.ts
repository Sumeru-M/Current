/**
 * Runtime configuration. Every tunable that a PM or ops lead might want to
 * change lives here rather than being scattered as magic numbers in components.
 */
export const APP = {
  name: "Aperture",
  tagline: "The intent engine for going out",
  /** Live telemetry must feel real-time. 12s poll → worst-case staleness < 20s. */
  liveRefetchMs: 12_000,
  /** Beyond this, live data is flagged stale in both apps. */
  freshnessThresholds: { live: 15, recent: 45, stale: 120 },
  /** Simulated network latency for mocks — a demo that resolves instantly reads
   *  as fake, and it hides loading states we need to prove are designed. */
  mockLatency: { min: 180, max: 460 },
  /** Deterministic seed so a pitch demo never renders differently twice. */
  seed: 20250725,
  /** How long a photo instant dwells before advancing. Clips use their own length. */
  instantDurationMs: 6_000,
  maxRecommendations: 8,
  /**
   * Voice capture. `en-IN` matters more than it looks: the same engine set to
   * en-US mangles neighbourhood names like Indiranagar and Koramangala, which
   * are exactly the words a user is most likely to say.
   */
  speech: {
    lang: "en-IN",
    /** Hard ceiling on one utterance, so an open mic can't run forever. */
    maxUtteranceMs: 15_000,
    /** iOS ignores this and ends on its own pause; that path is handled. */
    continuous: false,
  },
} as const;

export const STORAGE_KEYS = {
  saved: "aperture.saved.v1",
  intentHistory: "aperture.intent-history.v1",
  activeVenue: "aperture.business.active-venue.v1",
} as const;
