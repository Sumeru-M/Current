"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionLabel, Skeleton } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/field";
import { useAnalytics } from "@/hooks/use-domain-queries";
import { useBusinessContext } from "./business-context";
import { MetricCard } from "./metric-card";
import { BarSeries, DemandBars, DemandHeatmap } from "./charts";
import type { AnalyticsRange } from "@/types";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export function AnalyticsScreen() {
  const { activeVenueId, activeVenue } = useBusinessContext();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const { data, isLoading } = useAnalytics(activeVenueId, range);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
      <PageHeader
        eyebrow={activeVenue?.name}
        title="Analytics"
        subtitle="Demand, visibility and what it converts into"
        actions={
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={RANGES}
            ariaLabel="Analytics date range"
          />
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Rank — the headline, because it is the number that changes behaviour */}
          <Card tone="accent" pad="lg" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-[14px] bg-accent/15 text-accent">
                  <Trophy className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[12px] text-muted">
                    Live recommendation rank
                  </p>
                  <p className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                    #{data.rank.position}
                    <span className="text-[15px] font-normal text-muted">
                      {" "}
                      of {data.rank.totalVenues} in{" "}
                      {activeVenue?.neighbourhood ?? "your area"}
                    </span>
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "text-[13px] font-medium tabular-nums",
                  data.rank.changeFromYesterday >= 0
                    ? "text-positive"
                    : "text-critical",
                )}
              >
                {data.rank.changeFromYesterday >= 0 ? "+" : ""}
                {data.rank.changeFromYesterday} vs yesterday
              </span>
            </div>

            {data.rank.biggestOpportunity ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-accent/20 bg-canvas/40 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    {data.rank.biggestOpportunity.label}
                  </p>
                  <p className="text-[12px] text-muted">
                    {data.rank.biggestOpportunity.action} — worth about{" "}
                    {data.rank.biggestOpportunity.potentialPositions} position
                    {data.rank.biggestOpportunity.potentialPositions === 1
                      ? ""
                      : "s"}
                    .
                  </p>
                </div>
                <Link
                  href="/business/live"
                  className="group flex shrink-0 items-center gap-1 text-[12px] font-medium text-accent"
                >
                  Fix it
                  <ArrowRight
                    className="size-3 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </div>
            ) : null}
          </Card>

          <section className="space-y-3">
            <SectionLabel>Performance</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="space-y-3">
              <SectionLabel>When people search</SectionLabel>
              <Card pad="lg">
                <BarSeries
                  series={data.demandByHour}
                  label="Searches by hour"
                />
              </Card>
            </section>

            <section className="space-y-3">
              <SectionLabel>Demand heatmap</SectionLabel>
              <Card pad="lg" className="flex h-full items-center">
                <DemandHeatmap rows={data.heatmap} className="w-full" />
              </Card>
            </section>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="space-y-3">
              <SectionLabel>Most requested music</SectionLabel>
              <Card pad="lg">
                <DemandBars slices={data.topVibes} />
                <p className="mt-4 text-[12px] leading-relaxed text-subtle">
                  These are the vibes groups actually asked for near you — not
                  what they clicked. Tag the genres you really play to catch
                  them.
                </p>
              </Card>
            </section>

            <section className="space-y-3">
              <SectionLabel>Budget per person</SectionLabel>
              <Card pad="lg">
                <DemandBars slices={data.budgetDistribution} />
                <p className="mt-4 text-[12px] leading-relaxed text-subtle">
                  Your cover charge is compared against these bands every time
                  someone searches.
                </p>
              </Card>
            </section>
          </div>

          <Card tone="ghost" pad="lg" className="space-y-1.5">
            <p className="text-[13px] font-medium text-ink">
              Coming next: AI insights
            </p>
            <p className="text-[12px] leading-relaxed text-muted">
              Weekly written analysis of why your rank moved, which nights you
              are leaving money on the table, and what to change. Built on the
              same factor breakdown the ranker already publishes — no new
              instrumentation needed.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
