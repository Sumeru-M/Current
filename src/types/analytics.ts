export interface MetricPoint {
  label: string;
  value: number;
}

export interface TrendMetric {
  id: string;
  label: string;
  value: number;
  /** Percentage change vs the comparison window. Null when there's no history. */
  deltaPct: number | null;
  format: "number" | "percent" | "currency" | "duration";
  hint: string;
  series: MetricPoint[];
}

export interface DemandSlice {
  label: string;
  /** Share of demand 0–1 within its group. */
  share: number;
  count: number;
}

export interface RankSnapshot {
  position: number;
  totalVenues: number;
  changeFromYesterday: number;
  /** Which factor is currently costing the most rank. */
  biggestOpportunity: {
    factorId: string;
    label: string;
    potentialPositions: number;
    action: string;
  } | null;
}

export interface AnalyticsSummary {
  venueId: string;
  range: AnalyticsRange;
  metrics: TrendMetric[];
  /** Search volume by hour of day, 0–23, used for the demand heatmap. */
  demandByHour: MetricPoint[];
  /** Rows = days of week, cols = hours; values 0–1. */
  heatmap: { day: string; values: number[] }[];
  topVibes: DemandSlice[];
  budgetDistribution: DemandSlice[];
  rank: RankSnapshot;
  generatedAt: string;
}

export type AnalyticsRange = "today" | "7d" | "30d";

/**
 * An operational nudge. Modelled as data, not as a toast call, so the same
 * object can drive an in-app banner today and a push notification later
 * without the UI knowing which channel it came from.
 */
export interface OperationalNudge {
  id: string;
  venueId: string;
  severity: "info" | "opportunity" | "urgent";
  title: string;
  body: string;
  action: { label: string; href: string } | null;
  createdAt: string;
}
