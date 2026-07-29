"use client";

import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { MediaSurface } from "@/components/domain/media-surface";
import {
  QueueIndicator,
  FreshnessChip,
} from "@/components/domain/live-indicators";
import { useAvailabilityMany, useVenues } from "@/hooks/use-domain-queries";
import { useSavedStore } from "@/stores/saved";
import { ACTIVE_VERTICAL } from "@/config/verticals";
import { formatRelativeTime } from "@/lib/format";

/**
 * Saved list.
 *
 * Saved venues carry the *intent that surfaced them* ("6 of you, techno, under
 * ₹3,000"). A bare bookmark list loses the reason and becomes junk within a
 * week; the context line is what makes a save worth returning to.
 *
 * Availability is fetched in one batched call, not one per row.
 */
export function SavedScreen() {
  const items = useSavedStore((s) => s.items);
  const remove = useSavedStore((s) => s.remove);
  const { data: venues, isLoading } = useVenues(ACTIVE_VERTICAL);
  const savedIds = items.map((item) => item.venueId);
  const { data: availability } = useAvailabilityMany(savedIds);

  const rows = items
    .map((item) => ({
      item,
      venue: venues?.find((v) => v.id === item.venueId),
    }))
    .filter(
      (
        row,
      ): row is {
        item: (typeof items)[number];
        venue: NonNullable<typeof row.venue>;
      } => Boolean(row.venue),
    );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
      <PageHeader
        title="Saved"
        subtitle={
          items.length
            ? `${items.length} place${items.length === 1 ? "" : "s"}`
            : undefined
        }
      />

      {isLoading && items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Skeleton
              key={item.venueId}
              className="h-20 w-full rounded-[var(--radius-card)]"
            />
          ))}
        </div>
      ) : null}

      {!items.length ? (
        <EmptyState
          icon={<Bookmark className="size-6" />}
          title="Nothing saved yet"
          description="Tap the bookmark on any recommendation and it lands here, with the reason it was suggested."
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
        {rows.map(({ item, venue }) => {
          const live = availability?.[venue.id];
          return (
            <li key={venue.id}>
              <Card className="flex items-center gap-3">
                <Link href={`/venue/${venue.id}`} className="shrink-0">
                  <MediaSurface
                    gradient={venue.media[0].gradient}
                    accent={venue.media[0].accent}
                    alt={venue.media[0].alt}
                    className="size-14 rounded-[12px]"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/venue/${venue.id}`}>
                    <p className="truncate text-[14px] font-medium text-ink">
                      {venue.name}
                    </p>
                  </Link>
                  {item.contextLabel ? (
                    <p className="truncate text-[12px] text-muted">
                      {item.contextLabel}
                    </p>
                  ) : (
                    <p className="truncate text-[12px] text-muted">
                      {venue.neighbourhood}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    {live ? (
                      <QueueIndicator availability={live} compact />
                    ) : null}
                    {live ? (
                      <FreshnessChip
                        updatedAt={live.updatedAt}
                        showLabel={false}
                      />
                    ) : null}
                    <span className="text-[11px] text-subtle">
                      Saved {formatRelativeTime(item.savedAt)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(venue.id)}
                  aria-label={`Remove ${venue.name} from saved`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
