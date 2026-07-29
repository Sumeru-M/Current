"use client";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { DemandSlice, MetricPoint } from "@/types";

/**
 * Charts, hand-built with SVG and CSS grid.
 *
 * Recharts/visx would add 40–90kb and a second visual language we would then
 * spend a sprint overriding to match the design system. These are three chart
 * types with fixed requirements — a sparkline, a bar series, a heatmap — and
 * each is under 60 lines. Owning them keeps the dashboard in one typographic
 * and colour system, which is the difference between a product and a template.
 *
 * The line we would cross: axes with real scales, zoom, brushing, or more than
 * ~6 chart types. At that point adopt a library rather than build one.
 */

export function Sparkline({
  series,
  tone = "accent",
  className,
}: {
  series: MetricPoint[];
  tone?: "accent" | "positive" | "critical";
  className?: string;
}) {
  if (series.length < 2) return null;
  const values = series.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 30 - ((value - min) / range) * 28 - 1;
      return `${x},${y}`;
    })
    .join(" ");

  const strokeClass = {
    accent: "stroke-accent",
    positive: "stroke-positive",
    critical: "stroke-critical",
  }[tone];

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={cn(strokeClass, "animate-enter-fade")}
      />
    </svg>
  );
}

export function BarSeries({
  series,
  label,
  className,
}: {
  series: MetricPoint[];
  label: string;
  className?: string;
}) {
  const max = Math.max(...series.map((p) => p.value)) || 1;

  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div
        className="flex h-32 items-end gap-1.5"
        role="img"
        aria-label={label}
      >
        {series.map((point, index) => (
          <div
            key={point.label}
            className="group flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              style={{
                height: `${Math.max(3, (point.value / max) * 100)}%`,
                animationDelay: `${index * 20}ms`,
              }}
              className="w-full animate-enter-fade rounded-t-[3px] bg-accent/35 transition-colors group-hover:bg-accent"
              title={`${point.label}: ${formatNumber(point.value)}`}
            />
            <span className="text-[9px] tabular-nums text-subtle">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function DemandBars({
  slices,
  className,
}: {
  slices: DemandSlice[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {slices.map((slice, index) => (
        <li key={slice.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-ink">{slice.label}</span>
            <span className="text-[12px] tabular-nums text-muted">
              {Math.round(slice.share * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              style={{
                width: `${slice.share * 100}%`,
                animationDelay: `${index * 50}ms`,
              }}
              className="h-full animate-enter-fade rounded-full bg-accent"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const HOUR_LABELS = ["6p", "7p", "8p", "9p", "10p", "11p", "12a", "1a"];

export function DemandHeatmap({
  rows,
  className,
}: {
  rows: { day: string; values: number[] }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1 pl-9">
        {HOUR_LABELS.map((hour) => (
          <span
            key={hour}
            className="flex-1 text-center text-[9px] text-subtle"
          >
            {hour}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.day} className="flex items-center gap-1">
          <span className="w-8 shrink-0 text-[10px] text-subtle">
            {row.day}
          </span>
          {row.values.map((value, index) => (
            <div
              key={`${row.day}-${index}`}
              className="h-6 flex-1 rounded-[3px] border border-line/50"
              style={{
                backgroundColor: `rgba(124, 92, 255, ${(value * 0.85).toFixed(2)})`,
              }}
              title={`${row.day} ${HOUR_LABELS[index]} — ${Math.round(value * 100)}% of peak demand`}
              role="img"
              aria-label={`${row.day} ${HOUR_LABELS[index]}: ${Math.round(value * 100)} percent of peak demand`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
