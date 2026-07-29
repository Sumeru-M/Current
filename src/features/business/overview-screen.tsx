"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard, Radio } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionLabel, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  CapacityMeter,
  FreshnessChip,
  QueueIndicator,
} from "@/components/domain/live-indicators";
import { MediaSurface } from "@/components/domain/media-surface";
import { formatMoney, formatRelativeTime } from "@/lib/format";
import {
  useAnalytics,
  useAvailability,
  useInstants,
} from "@/hooks/use-domain-queries";
import { useBusinessContext } from "./business-context";
import { NudgeStack } from "./nudge-stack";
import { MetricCard } from "./metric-card";

/**
 * Overview.
 *
 * Answers three questions in the order a GM asks them on arrival:
 *   Is my data live? → How is tonight going? → What should I do next?
 *
 * Deliberately not a wall of charts. The deep analysis lives one click away in
 * Analytics; this screen exists to be glanced at between door problems.
 */
export function OverviewScreen() {
  const { activeVenue, activeVenueId, business, isLoading } =
    useBusinessContext();
  const { data: availability } = useAvailability(activeVenueId);
  const { data: analytics } = useAnalytics(activeVenueId, "today");
  const { data: instants = [] } = useInstants(activeVenueId);

  if (isLoading || !activeVenue) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const headline = analytics?.metrics.filter((m) =>
    ["impressions", "clicks", "bookings", "conversion"].includes(m.id),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
      <PageHeader
        eyebrow={business?.displayName}
        title={activeVenue.name}
        subtitle={`${activeVenue.neighbourhood}, ${activeVenue.city}`}
        actions={
          <Link href="/business/live">
            <Button variant="primary" size="sm">
              <Radio className="size-4" aria-hidden />
              Update live status
            </Button>
          </Link>
        }
      />

      <div className="space-y-8">
        {activeVenueId ? <NudgeStack venueId={activeVenueId} /> : null}

        <div className="grid gap-3 lg:grid-cols-3">
          {/* Live status */}
          <Card pad="lg" className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Live right now</SectionLabel>
              {availability ? (
                <FreshnessChip updatedAt={availability.updatedAt} />
              ) : null}
            </div>

            {availability ? (
              <>
                <CapacityMeter
                  availability={availability}
                  capacity={activeVenue.capacity}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[12px] text-subtle">Queue</p>
                    <QueueIndicator availability={availability} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] text-subtle">Cover</p>
                    <p className="text-[13px] font-medium text-ink">
                      {formatMoney(availability.entryFee)}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-subtle">
                  Published {formatRelativeTime(availability.updatedAt)}
                  {availability.updatedBy
                    ? ` by ${availability.updatedBy}`
                    : ""}{" "}
                  · {availability.offersRemaining} tables left
                </p>
              </>
            ) : (
              <Skeleton className="h-28 w-full" />
            )}
          </Card>

          {/* Story status */}
          <Card pad="lg" className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <SectionLabel>Instants</SectionLabel>
              {instants.length ? (
                <>
                  <MediaSurface
                    gradient={instants[0].media.gradient}
                    accent={instants[0].media.accent}
                    url={
                      instants[0].media.kind === "image"
                        ? instants[0].media.url
                        : undefined
                    }
                    alt={instants[0].caption}
                    className="h-24 w-full rounded-[12px]"
                  />
                  <p className="line-clamp-2 text-[13px] text-ink">
                    {instants[0].caption}
                  </p>
                  <p className="text-[11px] text-subtle">
                    {instants[0].viewCount.toLocaleString("en-IN")} views ·{" "}
                    {formatRelativeTime(instants[0].createdAt)}
                  </p>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted">
                  Nothing live. A photo or 10-second clip shows up right on your
                  recommendation card — venues with a live instant get roughly
                  2.3× the clicks from groups still deciding.
                </p>
              )}
            </div>
            <Link href="/business/instants">
              <Button
                variant={instants.length ? "secondary" : "primary"}
                size="sm"
                block
              >
                <Clapperboard className="size-4" aria-hidden />
                {instants.length ? "Manage instants" : "Post an instant"}
              </Button>
            </Link>
          </Card>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Today</SectionLabel>
            <Link
              href="/business/analytics"
              className="group flex items-center gap-1 text-[12px] text-muted hover:text-ink"
            >
              Full analytics
              <ArrowRight
                className="size-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
          {headline ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {headline.map((metric) => (
                <MetricCard key={metric.id} metric={metric} compact />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton
                  key={i}
                  className="h-24 rounded-[var(--radius-card)]"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
