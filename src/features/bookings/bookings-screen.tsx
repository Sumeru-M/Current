"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useBookings, useVenues } from "@/hooks/use-domain-queries";
import { ACTIVE_VERTICAL } from "@/config/verticals";
import { formatTime } from "@/lib/format";

/**
 * Bookings.
 *
 * Real, not a stub — holds created in the venue flow appear here immediately.
 * Payments, cancellation windows and venue-side confirmation are explicitly out
 * of scope for the pilot and are stated as such in the UI rather than faked,
 * because promising a confirmed reservation we cannot honour is the fastest way
 * to lose a pilot venue.
 */
export function BookingsScreen() {
  const { data: bookings, isLoading } = useBookings();
  const { data: venues } = useVenues(ACTIVE_VERTICAL);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
      <PageHeader title="Bookings" subtitle="Holds you've placed tonight" />

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
      ) : null}

      {!isLoading && !bookings?.length ? (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title="No holds yet"
          description="Reserve a table from any venue page and it shows up here with the reference to give at the door."
          action={
            <Link href="/">
              <Button size="sm" variant="secondary">
                Find somewhere
              </Button>
            </Link>
          }
        />
      ) : null}

      <ul className="space-y-2">
        {bookings?.map((booking) => {
          const venue = venues?.find((v) => v.id === booking.venueId);
          return (
            <li key={booking.id}>
              <Card className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {venue?.name ?? "Venue"}
                    </p>
                    <p className="text-[12px] text-muted">
                      {booking.guests} guest{booking.guests === 1 ? "" : "s"} ·{" "}
                      {formatTime(booking.scheduledFor)}
                    </p>
                  </div>
                  <Badge
                    tone={booking.status === "held" ? "caution" : "positive"}
                  >
                    {booking.status === "held" ? "Held" : booking.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-canvas/50 px-3 py-2">
                  <span className="text-[12px] text-subtle">
                    Show at the door
                  </span>
                  <span className="font-mono text-[14px] tracking-[0.08em] text-ink">
                    {booking.reference}
                  </span>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {bookings?.length ? (
        <p className="pt-4 text-center text-[12px] text-subtle">
          Payments and venue-side confirmation arrive with the full release.
        </p>
      ) : null}
    </div>
  );
}
