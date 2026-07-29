import { MapPin } from "lucide-react";
import type { Venue } from "@/types";

/**
 * Map placeholder.
 *
 * A deliberate non-integration. Shipping Mapbox/Google here would add an API
 * key, a billing account and ~180kb of JS to a demo whose job is to prove the
 * decision engine — and a half-styled default map basemap actively cheapens a
 * premium UI. This renders a schematic that matches the design language and
 * hands off to the user's own maps app, which is what people do anyway.
 *
 * Replacing it later is a single component swap behind the same props.
 */
export function VenueMap({ venue }: { venue: Venue }) {
  return (
    <div
      role="img"
      aria-label={`Map showing ${venue.name} in ${venue.neighbourhood}`}
      className="relative h-44 w-full overflow-hidden rounded-[14px] border border-line bg-surface"
    >
      {/* Schematic street grid */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 176"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <pattern
            id="grid"
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M44 0H0V44"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="400" height="176" fill="url(#grid)" />
        <path
          d="M0 120 L120 100 L210 130 L400 96"
          fill="none"
          stroke="var(--color-line-strong)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M180 0 L200 176"
          fill="none"
          stroke="var(--color-line-strong)"
          strokeWidth="4"
        />
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="absolute -inset-4 rounded-full"
          style={{ background: `${venue.brandColor}22` }}
          aria-hidden
        />
        <span
          className="relative grid size-9 place-items-center rounded-full text-canvas"
          style={{ background: venue.brandColor }}
        >
          <MapPin className="size-4" aria-hidden />
        </span>
      </div>

      <div className="absolute inset-x-3 bottom-3 rounded-[10px] border border-line bg-canvas/85 px-3 py-2 backdrop-blur">
        <p className="text-[13px] font-medium text-ink">
          {venue.neighbourhood}
        </p>
        <p className="text-[12px] text-muted">{venue.address}</p>
      </div>
    </div>
  );
}
