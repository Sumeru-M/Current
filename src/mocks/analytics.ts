import type {
  AnalyticsRange,
  AnalyticsSummary,
  Availability,
  DemandSlice,
  MetricPoint,
  OperationalNudge,
  TrendMetric,
} from "@/types";
import { createRng, hashString, nowIso } from "./runtime";
import { getFreshness } from "@/lib/format";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const series = (
  rng: () => number,
  points: number,
  base: number,
  volatility: number,
): MetricPoint[] =>
  Array.from({ length: points }, (_, i) => ({
    label: `${i}`,
    value: Math.max(
      0,
      Math.round(base * (0.6 + rng() * volatility) * (1 + i / (points * 2))),
    ),
  }));

const RANGE_POINTS: Record<AnalyticsRange, number> = {
  today: 12,
  "7d": 7,
  "30d": 30,
};
const RANGE_MULTIPLIER: Record<AnalyticsRange, number> = {
  today: 1,
  "7d": 6.4,
  "30d": 26,
};

export const buildAnalytics = (
  venueId: string,
  range: AnalyticsRange,
  live: Availability,
): AnalyticsSummary => {
  const rng = createRng(hashString(venueId + range));
  const points = RANGE_POINTS[range];
  const mult = RANGE_MULTIPLIER[range];

  const impressions = Math.round((2400 + rng() * 2600) * mult);
  const clicks = Math.round(impressions * (0.16 + rng() * 0.12));
  const views = Math.round(clicks * (0.72 + rng() * 0.2));
  const bookings = Math.round(clicks * (0.08 + rng() * 0.07));
  const conversion = (bookings / Math.max(1, clicks)) * 100;

  const metric = (
    id: string,
    label: string,
    value: number,
    format: TrendMetric["format"],
    hint: string,
    base: number,
  ): TrendMetric => ({
    id,
    label,
    value,
    deltaPct: Number(((rng() - 0.38) * 42).toFixed(1)),
    format,
    hint,
    series: series(rng, points, base, 0.8),
  });

  return {
    venueId,
    range,
    metrics: [
      metric(
        "impressions",
        "Recommendation impressions",
        impressions,
        "number",
        "Times you appeared in an AI answer",
        impressions / points,
      ),
      metric(
        "clicks",
        "Recommendation clicks",
        clicks,
        "number",
        "Groups who opened your venue",
        clicks / points,
      ),
      metric(
        "views",
        "Profile views",
        views,
        "number",
        "Full profile opens",
        views / points,
      ),
      metric(
        "bookings",
        "Bookings",
        bookings,
        "number",
        "Tables and entries held",
        bookings / points,
      ),
      metric(
        "conversion",
        "Click → booking",
        conversion,
        "percent",
        "Of groups who opened you, this many booked",
        conversion,
      ),
      metric(
        "queue",
        "Avg. queue reported",
        live.queueMinutes,
        "duration",
        "What groups see at your door",
        live.queueMinutes,
      ),
    ],
    demandByHour: Array.from({ length: 12 }, (_, i) => {
      const hour = (i + 16) % 24;
      const peak = 1 - Math.abs(hour - 23.5) / 7;
      return {
        label: `${((hour + 11) % 12) + 1}${hour < 12 ? "am" : "pm"}`,
        value: Math.max(0, Math.round((peak * 100 + rng() * 20) * (mult / 3))),
      };
    }),
    heatmap: DAYS.map((day, dayIndex) => ({
      day,
      values: Array.from({ length: 8 }, (_, i) => {
        const weekendBoost = dayIndex >= 4 ? 0.42 : 0;
        const peak = 1 - Math.abs(i - 5) / 6;
        return Math.max(
          0,
          Math.min(1, peak * 0.7 + weekendBoost + rng() * 0.16),
        );
      }),
    })),
    topVibes: normalise([
      { label: "Techno", count: Math.round(240 * mult * (0.5 + rng())) },
      { label: "House", count: Math.round(210 * mult * (0.5 + rng())) },
      { label: "Hip-Hop", count: Math.round(160 * mult * (0.5 + rng())) },
      { label: "Rooftop", count: Math.round(120 * mult * (0.5 + rng())) },
      { label: "Low-key", count: Math.round(90 * mult * (0.5 + rng())) },
    ]),
    budgetDistribution: normalise([
      { label: "Under ₹1,000", count: Math.round(120 * mult * (0.4 + rng())) },
      { label: "₹1,000–2,500", count: Math.round(300 * mult * (0.6 + rng())) },
      { label: "₹2,500–5,000", count: Math.round(190 * mult * (0.5 + rng())) },
      { label: "₹5,000+", count: Math.round(70 * mult * (0.3 + rng())) },
    ]),
    rank: buildRank(venueId, live),
    generatedAt: nowIso(),
  };
};

const normalise = (rows: { label: string; count: number }[]): DemandSlice[] => {
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  return rows
    .map((r) => ({ ...r, share: r.count / total }))
    .sort((a, b) => b.count - a.count);
};

/**
 * The rank snapshot is the single most valuable screen for a venue owner, so
 * it is not a vanity number: it names the factor currently costing the most
 * positions and the action that fixes it. That mapping comes from the same
 * factor ids the ranker emits, so the advice can never contradict the algorithm.
 */
const buildRank = (
  venueId: string,
  live: Availability,
): AnalyticsSummary["rank"] => {
  const rng = createRng(hashString(venueId + "rank"));
  const freshness = getFreshness(live.updatedAt);

  const opportunity = (() => {
    if (freshness.level === "stale" || freshness.level === "expired") {
      return {
        factorId: "freshness",
        label: "Live data is stale",
        potentialPositions: 3,
        action: "Update capacity and queue to regain the freshness bonus",
      };
    }
    if (live.queueMinutes > 25) {
      return {
        factorId: "queue",
        label: "Queue is above what groups ask for",
        potentialPositions: 2,
        action: "Open a second door lane or publish a guest-list window",
      };
    }
    if (live.offersRemaining === 0) {
      return {
        factorId: "group",
        label: "No tables held for groups",
        potentialPositions: 2,
        action: "Release one table back to inventory for groups of six",
      };
    }
    return {
      factorId: "vibe",
      label: "Music tags are narrow",
      potentialPositions: 1,
      action: "Add the genres you actually play after midnight",
    };
  })();

  return {
    position: 1 + Math.floor(rng() * 5),
    totalVenues: 34,
    changeFromYesterday: Math.round((rng() - 0.45) * 6),
    biggestOpportunity: opportunity,
  };
};

/**
 * Nudges are generated from live state, never scheduled blindly. A venue that
 * updated two minutes ago must not be told to update — that is how ops teams
 * learn to ignore an app.
 */
export const buildNudges = (
  venueId: string,
  live: Availability,
): OperationalNudge[] => {
  const rng = createRng(hashString(venueId + "nudge"));
  const freshness = getFreshness(live.updatedAt);
  const nudges: OperationalNudge[] = [];
  const searching = 40 + Math.round(rng() * 180);

  if (freshness.level === "stale" || freshness.level === "expired") {
    nudges.push({
      id: `n_${venueId}_stale`,
      venueId,
      severity: "urgent",
      title: `${searching} groups are searching near you right now`,
      body: `Your live status is ${Math.round(freshness.ageMinutes)} minutes old. Venues updated in the last 15 minutes rank above you.`,
      action: { label: "Update live status", href: "/business/live" },
      createdAt: nowIso(),
    });
  }

  if (live.offersRemaining <= 1) {
    nudges.push({
      id: `n_${venueId}_tables`,
      venueId,
      severity: "opportunity",
      title: "Tables are nearly gone",
      body: `${live.offersRemaining} left. Groups of six are your highest-converting segment tonight.`,
      action: { label: "Manage inventory", href: "/business/live" },
      createdAt: nowIso(),
    });
  }

  if (live.occupancyBand === "plenty") {
    nudges.push({
      id: `n_${venueId}_fill`,
      venueId,
      severity: "opportunity",
      title: "Room is filling slower than usual",
      body: "Post an instant now and you're in front of groups still deciding. Venues with a live instant get 2.3× the clicks.",
      action: { label: "Post an instant", href: "/business/instants" },
      createdAt: nowIso(),
    });
  }

  if (!nudges.length) {
    nudges.push({
      id: `n_${venueId}_ok`,
      venueId,
      severity: "info",
      title: "You're fully live",
      body: `Everything is current and ${searching} groups are searching nearby. Nothing to do.`,
      action: null,
      createdAt: nowIso(),
    });
  }

  return nudges;
};
