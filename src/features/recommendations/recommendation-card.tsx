"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  CalendarClock,
  Car,
  Footprints,
  MapPin,
  Music2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatDistance,
  formatDuration,
  formatMoney,
  priceBandLabel,
} from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import { MediaSurface } from "@/components/domain/media-surface";
import {
  CapacityBadge,
  FreshnessChip,
  QueueIndicator,
} from "@/components/domain/live-indicators";
import {
  MatchBreakdown,
  MatchHeadline,
  MatchScore,
} from "@/components/domain/match";
import { useSavedStore } from "@/stores/saved";
import { useInstants } from "@/hooks/use-domain-queries";
import { InstantViewer } from "@/features/venue/instant-viewer";
import type { Recommendation } from "@/types";
import { getVertical } from "@/config/verticals";
import { nextOpening } from "@/lib/hours";

/**
 * RecommendationCard
 *
 * Reads top-down in the order a group actually decides:
 *   what is it → why this one → can we get in → what does it cost → go.
 *
 * The vertical descriptor drives which attributes surface, so this component
 * renders a club today and a restaurant the day we add the fixture — no fork,
 * no `if (verticalId === "club")`.
 */
export function RecommendationCard({
  recommendation,
  contextLabel,
  index = 0,
}: {
  recommendation: Recommendation;
  contextLabel?: string | null;
  index?: number;
}) {
  const {
    venue,
    availability,
    match,
    travel,
    featuredOffer,
    hasInstant,
    rank,
  } = recommendation;
  const vertical = getVertical(venue.verticalId);
  const saved = useSavedStore((s) =>
    s.items.some((item) => item.venueId === venue.id),
  );
  const [instantsOpen, setInstantsOpen] = useState(false);
  /**
   * Instants are fetched only for venues that have one — `hasInstant` comes
   * back with the ranking, so a list of eight cards makes zero extra requests
   * for the venues with nothing to show.
   */
  const { data: instants = [] } = useInstants(
    hasInstant ? venue.id : undefined,
  );
  const toggle = useSavedStore((s) => s.toggle);

  const cardAttributes = vertical.attributes.filter((a) => a.surfaceOnCard);
  /**
   * A closed venue never shows live telemetry. "Busy · 6 min wait" for a room
   * that doesn't open for another six hours is the single fastest way to lose
   * a user's trust in the whole live layer.
   */
  const opening = availability.isOpen ? null : nextOpening(venue);
  const hero = venue.media[0];
  const TravelIcon = travel.mode === "walk" ? Footprints : Car;

  return (
    <article
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
      className="group animate-enter overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-colors hover:border-line-strong"
    >
      <div className="relative">
        {/*
          When a venue has a live instant, the hero *is* the instant — tapping
          plays it in place. That is the whole point of the format: proof of
          the room appears at the moment of choosing, not two taps deeper on a
          profile page nobody opens.
        */}
        {hasInstant && instants.length ? (
          <button
            type="button"
            onClick={() => setInstantsOpen(true)}
            className="block w-full text-left"
            aria-label={`Watch ${venue.name}'s live instant`}
          >
            <MediaSurface
              gradient={instants[0].media.gradient}
              accent={instants[0].media.accent}
              url={
                instants[0].media.kind === "image"
                  ? instants[0].media.url
                  : undefined
              }
              alt={instants[0].caption}
              intensity="vivid"
              className="h-40 w-full sm:h-48"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-12 place-items-center rounded-full bg-black/45 ring-2 ring-white/70 backdrop-blur">
                  <Play
                    className="size-5 translate-x-0.5 fill-white text-white"
                    aria-hidden
                  />
                </span>
              </span>
            </MediaSurface>
          </button>
        ) : (
          <Link href={`/venue/${venue.id}`} className="block">
            <MediaSurface
              gradient={hero.gradient}
              accent={hero.accent}
              url={hero.url}
              alt={hero.alt}
              intensity="vivid"
              className="h-40 w-full sm:h-48"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
            </MediaSurface>
          </Link>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <Badge tone="neutral" className="bg-black/50 backdrop-blur">
            #{rank}
          </Badge>
          {/*
            Labelled "Instant", not "Live now". The venue can be closed while a
            still-unexpired instant is watchable, and two badges arguing about
            whether the place is open is exactly the kind of detail that makes
            a live product feel unreliable.
          */}
          {hasInstant ? (
            <Badge tone="accent" className="bg-black/50 backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent" />
              Instant
            </Badge>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => toggle(venue.id, contextLabel ?? null)}
          aria-pressed={saved}
          aria-label={
            saved ? `Remove ${venue.name} from saved` : `Save ${venue.name}`
          }
          className={cn(
            "absolute right-3 top-3 grid size-9 place-items-center rounded-full border backdrop-blur transition-colors",
            saved
              ? "border-accent/40 bg-accent-wash text-accent"
              : "border-white/10 bg-black/40 text-white/70 hover:text-white",
          )}
        >
          <Bookmark
            className={cn("size-4", saved && "fill-current")}
            aria-hidden
          />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/venue/${venue.id}`} className="block">
              <h3 className="truncate text-[17px] font-semibold tracking-[-0.015em] text-ink">
                {venue.name}
              </h3>
            </Link>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{venue.neighbourhood}</span>
              <span aria-hidden>·</span>
              <span className="shrink-0">
                {priceBandLabel(venue.priceBand)}
              </span>
            </p>
          </div>
          <MatchScore score={match.score} />
        </div>

        <MatchHeadline match={match} />

        {cardAttributes.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {cardAttributes.flatMap((attribute) => {
              const raw = venue.attributes[attribute.key];
              const values = Array.isArray(raw)
                ? raw
                : raw != null
                  ? [String(raw)]
                  : [];
              return values.slice(0, 3).map((value) => (
                <li key={`${attribute.key}-${value}`}>
                  <Badge tone="outline">
                    <Music2 className="size-3" aria-hidden />
                    {value}
                  </Badge>
                </li>
              ));
            })}
          </ul>
        ) : null}

        {/* Live strip — the row that makes this different from a listings app. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-line bg-canvas/50 px-3 py-2.5">
          {opening ? (
            <>
              <div className="flex items-center gap-1.5 text-[13px] text-ink">
                <CalendarClock className="size-3.5 text-caution" aria-hidden />
                {opening.label}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-ink">
                <TravelIcon className="size-3.5 text-subtle" aria-hidden />
                {formatDuration(travel.minutes)}
                <span className="text-subtle">
                  · {formatDistance(travel.distanceKm)}
                </span>
              </div>
              <Badge tone="neutral" className="ml-auto">
                Closed now
              </Badge>
            </>
          ) : (
            <>
              {vertical.supportsQueue ? (
                <QueueIndicator availability={availability} />
              ) : null}
              {vertical.supportsLiveOccupancy ? (
                <CapacityBadge availability={availability} />
              ) : null}
              <div className="flex items-center gap-1.5 text-[13px] text-ink">
                <TravelIcon className="size-3.5 text-subtle" aria-hidden />
                {formatDuration(travel.minutes)}
                <span className="text-subtle">
                  · {formatDistance(travel.distanceKm)}
                </span>
              </div>
              <FreshnessChip
                updatedAt={availability.updatedAt}
                className="ml-auto"
              />
            </>
          )}
        </div>

        <MatchBreakdown match={match} />

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="min-w-0">
            <p className="text-[13px] text-ink">
              {availability.entryFee
                ? `${formatMoney(availability.entryFee)} cover`
                : opening
                  ? "No cover listed"
                  : "No cover tonight"}
            </p>
            {featuredOffer ? (
              <p className="truncate text-[12px] text-muted">
                {featuredOffer.name} · {formatMoney(featuredOffer.price)}
              </p>
            ) : (
              <p className="text-[12px] text-subtle">
                {availability.offersRemaining} {vertical.bookingNoun}
                {availability.offersRemaining === 1 ? "" : "s"} left
              </p>
            )}
          </div>
          <Link
            href={`/venue/${venue.id}`}
            className="inline-flex h-9 shrink-0 items-center rounded-[10px] bg-accent px-4 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            View venue
          </Link>
        </div>
      </div>

      <InstantViewer
        open={instantsOpen}
        onClose={() => setInstantsOpen(false)}
        venueName={venue.name}
        instants={instants}
      />
    </article>
  );
}
