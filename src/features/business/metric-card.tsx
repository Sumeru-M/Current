"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/primitives";
import {
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { Sparkline } from "./charts";
import type { TrendMetric } from "@/types";

const renderValue = (metric: TrendMetric): string => {
  switch (metric.format) {
    case "percent":
      return formatPercent(metric.value, 1);
    case "currency":
      return formatMoney(
        { amount: metric.value, currency: "INR" },
        { compact: true },
      );
    case "duration":
      return formatDuration(metric.value);
    default:
      return formatNumber(metric.value);
  }
};

/**
 * MetricCard
 *
 * Every metric carries a `hint` explaining what it means in the venue's own
 * language ("Times you appeared in an AI answer"), because "impressions" means
 * five different things to five different people and a dashboard nobody trusts
 * is a dashboard nobody opens.
 */
export function MetricCard({
  metric,
  compact = false,
}: {
  metric: TrendMetric;
  compact?: boolean;
}) {
  const positive = (metric.deltaPct ?? 0) >= 0;
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] leading-snug text-muted">{metric.label}</p>
        {metric.deltaPct !== null ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums",
              positive ? "text-positive" : "text-critical",
            )}
          >
            <DeltaIcon className="size-3" aria-hidden />
            {Math.abs(metric.deltaPct).toFixed(1)}%
          </span>
        ) : null}
      </div>

      <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
        {renderValue(metric)}
      </p>

      {!compact ? (
        <>
          <Sparkline
            series={metric.series}
            tone={positive ? "accent" : "critical"}
          />
          <p className="text-[11px] leading-relaxed text-subtle">
            {metric.hint}
          </p>
        </>
      ) : null}
    </Card>
  );
}
