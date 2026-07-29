import { Clock, TrendingDown, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDuration, formatNumber, getFreshness } from "@/lib/format";
import { Badge, Meter } from "@/components/ui/primitives";
import { getBand, headcountRange } from "@/config/occupancy";
import type { Availability } from "@/types";

/**
 * Live telemetry components.
 *
 * Shared by both applications on purpose. When a venue looks at its own queue
 * indicator in the portal, it must be pixel-identical to what a customer sees —
 * that is the entire trust proposition of the live layer. Two implementations
 * would drift within a sprint.
 *
 * Occupancy always leads with the band. The exact percentage is supporting
 * detail, rendered smaller, and omitted entirely when the venue didn't report
 * one — which is the common case and must never look like missing data.
 */

/** Tailwind cannot see interpolated class names — tones are always looked up. */
const ICON_TONE = {
  positive: "text-positive",
  neutral: "text-muted",
  caution: "text-caution",
  critical: "text-critical",
} as const;

const TEXT_TONE = {
  positive: "text-positive",
  neutral: "text-ink",
  caution: "text-caution",
  critical: "text-critical",
} as const;

export function FreshnessChip({
  updatedAt,
  className,
  showLabel = true,
}: {
  updatedAt: string;
  className?: string;
  showLabel?: boolean;
}) {
  const freshness = getFreshness(updatedAt);
  const tone =
    freshness.level === "live"
      ? "positive"
      : freshness.level === "recent"
        ? "neutral"
        : freshness.level === "stale"
          ? "caution"
          : "critical";

  return (
    <Badge tone={tone} className={className}>
      <span className="relative flex size-1.5">
        {freshness.level === "live" ? (
          <span className="absolute inline-flex size-full animate-pulse-ring rounded-full text-positive" />
        ) : null}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {showLabel ? freshness.label : null}
    </Badge>
  );
}

export function QueueIndicator({
  availability,
  className,
  compact = false,
}: {
  availability: Availability;
  className?: string;
  compact?: boolean;
}) {
  const { queueMinutes, queueTrend } = availability;
  const tone =
    queueMinutes <= 5
      ? "positive"
      : queueMinutes <= 20
        ? "caution"
        : "critical";
  const Trend =
    queueTrend === "rising"
      ? TrendingUp
      : queueTrend === "falling"
        ? TrendingDown
        : null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Clock className={cn("size-3.5", ICON_TONE[tone])} aria-hidden />
      <span className="text-[13px] text-ink">
        {queueMinutes <= 2 ? "No queue" : formatDuration(queueMinutes)}
        {!compact && queueMinutes > 2 ? " wait" : ""}
      </span>
      {Trend && !compact ? (
        <Trend
          className={cn(
            "size-3",
            queueTrend === "rising" ? "text-critical" : "text-positive",
          )}
          aria-label={`Queue ${queueTrend}`}
        />
      ) : null}
    </div>
  );
}

/**
 * Compact occupancy for cards and list rows: the band, in words.
 * The percentage is appended only when the venue reported one, and only when
 * there is room for it.
 */
export function CapacityBadge({
  availability,
  className,
  compact = false,
}: {
  availability: Availability;
  className?: string;
  compact?: boolean;
}) {
  const band = getBand(availability.occupancyBand);
  const pct = availability.occupancyPct;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Users className={cn("size-3.5", ICON_TONE[band.tone])} aria-hidden />
      <span className="text-[13px] text-ink">{band.label}</span>
      {pct !== null && !compact ? (
        <span className="text-[12px] tabular-nums text-subtle">{pct}%</span>
      ) : null}
    </div>
  );
}

/**
 * The full occupancy read-out, used on venue detail and in the portal.
 *
 * Hierarchy is the whole design: band as the headline, then total capacity so
 * "Busy" means something concrete (busy in a 40-seat listening bar is not busy
 * in a 700-capacity club), then the exact figure last, if it exists at all.
 */
export function CapacityMeter({
  availability,
  capacity,
  className,
}: {
  availability: Availability;
  /** Venue's total capacity. Omit where it isn't published. */
  capacity?: number;
  className?: string;
}) {
  const band = getBand(availability.occupancyBand);
  const pct = availability.occupancyPct;
  const fill = pct ?? band.representativePct;
  const heads = capacity
    ? headcountRange(availability.occupancyBand, capacity)
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("text-[15px] font-medium", TEXT_TONE[band.tone])}>
          {band.label}
        </span>
        <span className="text-[12px] tabular-nums text-subtle">
          {pct !== null ? `${pct}% · ` : ""}
          {capacity ? `${formatNumber(capacity)} capacity` : null}
        </span>
      </div>

      <Meter
        value={fill / 100}
        tone={band.tone === "neutral" ? "accent" : band.tone}
        label={`${band.label}${pct !== null ? `, ${pct} percent` : ""}`}
      />

      {heads ? (
        <p className="text-[12px] text-muted">
          {pct !== null
            ? `Roughly ${formatNumber(Math.round((pct / 100) * capacity!))} of ${formatNumber(capacity!)} inside.`
            : `Roughly ${formatNumber(heads.from)}–${formatNumber(heads.to)} of ${formatNumber(capacity!)} inside.`}
        </p>
      ) : null}
    </div>
  );
}
