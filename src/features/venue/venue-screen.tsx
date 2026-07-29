"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clock3,
  MapPin,
  Navigation,
  Share2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatClock,
  formatMoney,
  formatRelativeTime,
  priceBandLabel,
} from "@/lib/format";
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  SectionLabel,
  Skeleton,
} from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { MediaSurface } from "@/components/domain/media-surface";
import {
  CapacityMeter,
  FreshnessChip,
  QueueIndicator,
} from "@/components/domain/live-indicators";
import { MatchScore } from "@/components/domain/match";
import { getVertical } from "@/config/verticals";
import {
  useAvailability,
  useOffers,
  useSimilarVenues,
  useInstants,
  useVenue,
} from "@/hooks/use-domain-queries";
import { useSavedStore } from "@/stores/saved";
import { InstantViewer } from "./instant-viewer";
import { BookingDialog } from "./booking-dialog";
import { VenueMap } from "./venue-map";
import type { Offer } from "@/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function VenueScreen({ venueId }: { venueId: string }) {
  const router = useRouter();
  const { data: venue, isLoading } = useVenue(venueId);
  const { data: availability } = useAvailability(venueId);
  const { data: offers } = useOffers(venueId);
  const { data: instants = [] } = useInstants(venueId);
  const { data: similar = [] } = useSimilarVenues(venueId);
  const saved = useSavedStore((s) =>
    s.items.some((i) => i.venueId === venueId),
  );
  const toggleSaved = useSavedStore((s) => s.toggle);

  const [instantsOpen, setInstantsOpen] = useState(false);
  const [bookingOffer, setBookingOffer] = useState<Offer | null>(null);

  if (isLoading) return <VenueSkeleton />;
  if (!venue) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Venue not found"
          description="This place may have been removed."
          action={
            <Link href="/">
              <Button size="sm">Back to search</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const vertical = getVertical(venue.verticalId);
  const hero = venue.media[0];
  const today = new Date().getDay();
  const todayHours = venue.openingHours.find((h) => h.day === today);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: venue.name, text: venue.tagline, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied", "Send it to the group chat.");
      }
    } catch {
      /* User dismissed the share sheet — not an error worth surfacing. */
    }
  };

  return (
    <article className="pb-10">
      {/* Hero */}
      <div className="relative">
        <MediaSurface
          gradient={hero.gradient}
          accent={hero.accent}
          url={hero.url}
          alt={hero.alt}
          intensity="vivid"
          className="h-64 w-full sm:h-80 lg:h-96"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/40 to-transparent" />
        </MediaSurface>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
            className="bg-black/40 text-white backdrop-blur hover:bg-black/60"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void share()}
              aria-label="Share venue"
              className="bg-black/40 text-white backdrop-blur hover:bg-black/60"
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleSaved(venue.id)}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save venue"}
              className={cn(
                "bg-black/40 backdrop-blur hover:bg-black/60",
                saved ? "text-accent" : "text-white",
              )}
            >
              <Bookmark className={cn("size-4", saved && "fill-current")} />
            </Button>
          </div>
        </div>

        {instants.length ? (
          <button
            type="button"
            onClick={() => setInstantsOpen(true)}
            className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full border border-accent/40 bg-black/50 py-1.5 pl-1.5 pr-4 backdrop-blur transition-colors hover:border-accent"
          >
            <span className="grid size-8 place-items-center rounded-full bg-accent/20 ring-2 ring-accent">
              <span className="size-2 rounded-full bg-accent" />
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-medium text-white">
                {instants.length > 1
                  ? `${instants.length} instants`
                  : "Live instant"}
              </span>
              <span className="block text-[11px] text-white/60">
                {formatRelativeTime(instants[0].createdAt)}
                {instants[0].media.kind === "video" ? " · clip" : ""}
              </span>
            </span>
          </button>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 pt-5 sm:px-6">
        {/* Identity */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {venue.verified ? (
              <Badge tone="accent">
                <ShieldCheck className="size-3" aria-hidden />
                Verified partner
              </Badge>
            ) : null}
            <Badge tone="neutral">
              <Star className="size-3 fill-current" aria-hidden />
              {venue.rating.toFixed(1)} ·{" "}
              {venue.ratingCount.toLocaleString("en-IN")}
            </Badge>
            <Badge tone="outline">{priceBandLabel(venue.priceBand)}</Badge>
          </div>

          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">
              {venue.name}
            </h1>
            <p className="mt-1 text-[15px] leading-relaxed text-muted">
              {venue.tagline}
            </p>
          </div>

          <p className="flex items-center gap-1.5 text-[13px] text-subtle">
            <MapPin className="size-3.5" aria-hidden />
            {venue.address}, {venue.city}
          </p>
        </header>

        {/* Live panel */}
        {availability ? (
          <Card tone="raised" pad="lg" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Right now</SectionLabel>
              <FreshnessChip updatedAt={availability.updatedAt} />
            </div>

            {vertical.supportsLiveOccupancy ? (
              <CapacityMeter
                availability={availability}
                capacity={venue.capacity}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {vertical.supportsQueue ? (
                <div className="space-y-1">
                  <p className="text-[12px] text-subtle">Queue</p>
                  <QueueIndicator availability={availability} />
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-[12px] text-subtle">Cover</p>
                <p className="text-[13px] font-medium text-ink">
                  {formatMoney(availability.entryFee)}
                </p>
              </div>
            </div>

            {availability.nowPlaying ? (
              <p className="text-[13px] text-muted">
                On now ·{" "}
                <span className="text-ink">{availability.nowPlaying}</span>
              </p>
            ) : null}

            {availability.announcement ? (
              <p className="rounded-[10px] border border-accent/25 bg-accent-wash px-3 py-2 text-[13px] text-accent">
                {availability.announcement}
              </p>
            ) : null}
          </Card>
        ) : (
          <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
        )}

        {/* Offers */}
        <section className="space-y-3">
          <SectionLabel>Book a {vertical.bookingNoun}</SectionLabel>
          {offers?.length ? (
            <ul className="space-y-2">
              {offers.map((item) => (
                <li key={item.id}>
                  <Card
                    tone="default"
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink">
                        {item.name}
                      </p>
                      <p className="text-[12px] text-muted">
                        {item.description}
                      </p>
                      {item.perks.length ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {item.perks.map((perk) => (
                            <li
                              key={perk}
                              className="flex items-center gap-1 text-[11px] text-subtle"
                            >
                              <Check
                                className="size-3 text-positive"
                                aria-hidden
                              />
                              {perk}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[14px] font-medium text-ink">
                          {formatMoney(item.price)}
                        </p>
                        <p className="text-[11px] text-subtle">
                          {item.remaining > 0
                            ? `${item.remaining} left`
                            : "Sold out"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={item.remaining > 0 ? "primary" : "secondary"}
                        disabled={item.remaining === 0}
                        onClick={() => setBookingOffer(item)}
                      >
                        {item.remaining > 0 ? "Reserve" : "Sold out"}
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
          )}
        </section>

        {/* Gallery */}
        {venue.media.length > 1 ? (
          <section className="space-y-3">
            <SectionLabel>Gallery</SectionLabel>
            <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {venue.media.map((asset) => (
                <li key={asset.id} className="w-64 shrink-0 snap-start">
                  <MediaSurface
                    gradient={asset.gradient}
                    accent={asset.accent}
                    url={asset.url}
                    alt={asset.alt}
                    className="h-40 w-full rounded-[14px]"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* About */}
        <section className="space-y-3">
          <SectionLabel>About</SectionLabel>
          <p className="text-[14px] leading-relaxed text-muted">
            {venue.description}
          </p>
        </section>

        {/* Attributes, vertical-driven */}
        <section className="space-y-3">
          <SectionLabel>Details</SectionLabel>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {vertical.attributes.map((attribute) => {
              const raw = venue.attributes[attribute.key];
              if (raw == null) return null;
              const value = Array.isArray(raw) ? raw.join(", ") : String(raw);
              return (
                <div key={attribute.key} className="space-y-0.5">
                  <dt className="text-[12px] text-subtle">{attribute.label}</dt>
                  <dd className="text-[14px] text-ink">{value}</dd>
                </div>
              );
            })}
            <div className="space-y-0.5">
              <dt className="text-[12px] text-subtle">Capacity</dt>
              <dd className="text-[14px] text-ink">
                {venue.capacity.toLocaleString("en-IN")} people
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-[12px] text-subtle">Age policy</dt>
              <dd className="text-[14px] text-ink">{venue.agePolicy}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-[12px] text-subtle">Dress code</dt>
              <dd className="text-[14px] text-ink">{venue.dressCode}</dd>
            </div>
          </dl>
        </section>

        {/* Amenities */}
        <section className="space-y-3">
          <SectionLabel>Amenities</SectionLabel>
          <ul className="flex flex-wrap gap-1.5">
            {venue.amenities.map((amenity) => (
              <li key={amenity.id}>
                <Badge tone="neutral" size="md">
                  {amenity.label}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        {/* Hours */}
        <section className="space-y-3">
          <SectionLabel>Opening hours</SectionLabel>
          <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
            {venue.openingHours.map((window) => (
              <li
                key={window.day}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 text-[13px]",
                  window.day === today && "bg-raised",
                )}
              >
                <span
                  className={
                    window.day === today ? "font-medium text-ink" : "text-muted"
                  }
                >
                  {DAY_NAMES[window.day]}
                </span>
                <span className={window.closed ? "text-subtle" : "text-ink"}>
                  {window.closed
                    ? "Closed"
                    : `${formatClock(window.opensAt)} – ${formatClock(window.closesAt)}`}
                </span>
              </li>
            ))}
          </ul>
          {todayHours && !todayHours.closed ? (
            <p className="flex items-center gap-1.5 text-[12px] text-subtle">
              <Clock3 className="size-3" aria-hidden />
              Open today until {formatClock(todayHours.closesAt)}
            </p>
          ) : null}
        </section>

        {/* Map */}
        <section className="space-y-3">
          <SectionLabel>Getting there</SectionLabel>
          <VenueMap venue={venue} />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${venue.location.lat},${venue.location.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            <Navigation className="size-3.5" aria-hidden />
            Open in Maps
          </a>
        </section>

        {/* Similar */}
        {similar.length ? (
          <>
            <Divider />
            <section className="space-y-3">
              <SectionLabel>Similar to {venue.name}</SectionLabel>
              <ul className="space-y-2">
                {similar.map((item) => (
                  <li key={item.id}>
                    <Link href={`/venue/${item.venue.id}`}>
                      <Card interactive className="flex items-center gap-3">
                        <MediaSurface
                          gradient={item.venue.media[0].gradient}
                          accent={item.venue.media[0].accent}
                          alt={item.venue.media[0].alt}
                          className="size-12 shrink-0 rounded-[10px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-ink">
                            {item.venue.name}
                          </p>
                          <p className="truncate text-[12px] text-muted">
                            {item.match.headline}
                          </p>
                        </div>
                        <MatchScore score={item.match.score} size={36} />
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        <p className="pt-2 text-center text-[12px] text-subtle">
          Reviews are coming with the next release.
        </p>
      </div>

      <InstantViewer
        instants={instants}
        open={instantsOpen}
        onClose={() => setInstantsOpen(false)}
        venueName={venue.name}
      />

      <BookingDialog
        venue={venue}
        offer={bookingOffer}
        open={Boolean(bookingOffer)}
        onClose={() => setBookingOffer(null)}
      />
    </article>
  );
}

function VenueSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-none sm:h-80" />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 sm:px-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
