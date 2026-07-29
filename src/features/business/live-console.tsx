"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus, RadioTower, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber, formatRelativeTime, getFreshness } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  Divider,
  SectionLabel,
  Skeleton,
} from "@/components/ui/primitives";
import { Field, Input, Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { FreshnessChip } from "@/components/domain/live-indicators";
import {
  useAvailability,
  useUpdateAvailability,
} from "@/hooks/use-domain-queries";
import { useBusinessContext } from "./business-context";
import { NudgeStack } from "./nudge-stack";
import { OCCUPANCY_BANDS, OCCUPANCY_BAND_ORDER } from "@/config/occupancy";
import type { Availability, OccupancyBand } from "@/types";

/**
 * Live operations console.
 *
 * The most important screen in the entire product, because every recommendation
 * downstream is only as good as what a door manager types here at 11pm.
 * Constraints that shaped it:
 *
 *  - Thumb-sized targets. Real usage is one-handed, in the dark, on a phone.
 *  - Occupancy is asked as four words, never as a number. A door manager asked
 *    for "% full" invents one, and an invented number poisons every
 *    recommendation downstream. Exact counts are opt-in for venues that
 *    genuinely measure them.
 *  - Queue stays a stepper: minutes are something a doorman actually knows.
 *  - Optimistic writes. See `useUpdateAvailability` — a spinner between tap and
 *    feedback trains staff to distrust the tool.
 *  - A single "publish" affordance with a dirty indicator, so a half-typed
 *    number never goes live by accident.
 *
 * Rejected alternative: auto-save on every keystroke. It reads as modern, but a
 * mistyped "150" broadcasting 150% capacity for 400ms to every searching user
 * is a real cost with no upside.
 */
export function LiveConsole() {
  const { activeVenueId, activeVenue } = useBusinessContext();
  const { data: availability, isLoading } = useAvailability(activeVenueId);
  const update = useUpdateAvailability(activeVenueId ?? "");

  /**
   * Local edits are held as a *patch over* server state rather than as a full
   * copy of it. Two things fall out of that for free: a colleague publishing
   * from another device flows straight through to any field you are not
   * currently editing, and there is no draft/server synchronisation effect to
   * get wrong. Dirty state is simply "the patch differs from what's live".
   */
  const [patchState, setPatchState] = useState<Partial<Availability>>({});
  const draft: Availability | null = availability
    ? { ...availability, ...patchState }
    : null;

  if (isLoading || !draft || !availability) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const dirty = (Object.keys(patchState) as (keyof Availability)[]).some(
    (key) =>
      key === "entryFee"
        ? draft.entryFee?.amount !== availability.entryFee?.amount
        : draft[key] !== availability[key],
  );

  const publish = async () => {
    await update.mutateAsync({
      occupancyBand: draft.occupancyBand,
      occupancyPct: draft.occupancyPct,
      queueMinutes: draft.queueMinutes,
      offersRemaining: draft.offersRemaining,
      entryFee: draft.entryFee,
      nowPlaying: draft.nowPlaying,
      announcement: draft.announcement,
      isOpen: draft.isOpen,
    });
    setPatchState({});
    toast.success(
      "You're live",
      "Groups searching right now see this immediately.",
    );
  };

  const patch = (next: Partial<Availability>) =>
    setPatchState((current) => ({ ...current, ...next }));

  const freshness = getFreshness(availability.updatedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 sm:px-6 lg:pb-10">
      <PageHeader
        eyebrow={activeVenue?.name}
        title="Live operations"
        subtitle={`Last published ${formatRelativeTime(availability.updatedAt)}${
          availability.updatedBy ? ` by ${availability.updatedBy}` : ""
        }`}
        actions={<FreshnessChip updatedAt={availability.updatedAt} />}
      />

      <div className="space-y-6">
        {activeVenueId ? <NudgeStack venueId={activeVenueId} /> : null}

        {/* Open/closed is the one switch that overrides everything else. */}
        <Card tone={draft.isOpen ? "default" : "accent"} pad="lg">
          <Switch
            checked={draft.isOpen}
            onCheckedChange={(next) => patch({ isOpen: next })}
            label={draft.isOpen ? "Open tonight" : "Closed"}
            description={
              draft.isOpen
                ? "You're eligible to appear in recommendations."
                : "You are hidden from all recommendations until you reopen."
            }
          />
        </Card>

        <section className="space-y-3">
          <SectionLabel>How full is the room?</SectionLabel>
          <Card pad="lg" className="space-y-4">
            <BandSelector
              value={draft.occupancyBand}
              onChange={(occupancyBand) => patch({ occupancyBand })}
            />

            <p className="text-[12px] leading-relaxed text-muted">
              {activeVenue
                ? `Guests see this in words, alongside your ${formatNumber(activeVenue.capacity)} capacity.`
                : "Guests see this in words, not as a number."}
            </p>

            <Divider />

            {/*
              Exact headcount is opt-in and stays collapsed. Making it a
              required field is what produces invented numbers; making it
              available means venues with door-counting hardware can still
              add precision, and it shows as supporting detail.
            */}
            <ExactCount
              value={draft.occupancyPct}
              capacity={activeVenue?.capacity}
              onChange={(occupancyPct) => patch({ occupancyPct })}
            />
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Door</SectionLabel>
          <Card pad="lg" className="space-y-5">
            <Stepper
              label="Queue"
              value={draft.queueMinutes}
              suffix=" min"
              step={5}
              min={0}
              max={180}
              onChange={(value) => patch({ queueMinutes: value })}
            />
            <Stepper
              label="Tables available"
              value={draft.offersRemaining}
              suffix=""
              step={1}
              min={0}
              max={40}
              onChange={(value) => patch({ offersRemaining: value })}
            />

            <Field label="Cover charge" hint="Set to 0 for free entry.">
              {({ id }) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-subtle">
                    ₹
                  </span>
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="pl-7"
                    value={(draft.entryFee?.amount ?? 0) / 100}
                    onChange={(event) => {
                      const rupees = Number(event.target.value || 0);
                      patch({
                        entryFee:
                          rupees > 0
                            ? { amount: rupees * 100, currency: "INR" }
                            : null,
                      });
                    }}
                  />
                </div>
              )}
            </Field>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Tonight</SectionLabel>
          <Card pad="lg" className="space-y-4">
            <Field
              label="Playing now"
              hint="Shows on your card and in match reasons."
            >
              {({ id }) => (
                <Input
                  id={id}
                  value={draft.nowPlaying ?? ""}
                  placeholder="Kohra b2b Zequenx"
                  onChange={(event) =>
                    patch({ nowPlaying: event.target.value || null })
                  }
                />
              )}
            </Field>
            <Field
              label="Announcement"
              optional
              hint="One line, shown to anyone viewing your venue. Clears itself when you empty it."
            >
              {({ id }) => (
                <Input
                  id={id}
                  value={draft.announcement ?? ""}
                  placeholder="Free entry for groups of 6 before 11"
                  onChange={(event) =>
                    patch({ announcement: event.target.value || null })
                  }
                />
              )}
            </Field>
          </Card>
        </section>

        {freshness.level !== "live" ? (
          <p className="text-[12px] leading-relaxed text-caution">
            Your data is {Math.round(freshness.ageMinutes)} minutes old. Venues
            updated within 15 minutes rank above you in every search.
          </p>
        ) : null}
      </div>

      {/* Publish bar — sticky above the mobile keyboard and thumb zone. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-xl transition-transform lg:sticky lg:bottom-4 lg:mt-6 lg:rounded-[14px] lg:border lg:px-4",
          !dirty && "lg:opacity-70",
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="min-w-0 text-[12px] text-muted">
            {dirty ? (
              <span className="flex items-center gap-1.5 text-caution">
                <span className="size-1.5 rounded-full bg-caution" />
                Unpublished changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <RadioTower className="size-3.5 text-positive" aria-hidden />
                Everything is live
              </span>
            )}
          </p>
          <Button
            variant="primary"
            onClick={() => void publish()}
            loading={update.isPending}
            disabled={!dirty}
          >
            <Save className="size-4" aria-hidden />
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * BandSelector.
 *
 * Four targets, each large enough to hit one-handed in the dark without
 * looking. This is the single highest-leverage control in the product: it is
 * the moment a venue tells the truth or doesn't. A slider or a number pad here
 * would get fudged; four honest words get tapped.
 */
function BandSelector({
  value,
  onChange,
}: {
  value: OccupancyBand;
  onChange: (band: OccupancyBand) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="How full is the room?"
      className="grid gap-2 sm:grid-cols-2"
    >
      {OCCUPANCY_BAND_ORDER.map((id) => {
        const band = OCCUPANCY_BANDS[id];
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "flex min-h-[68px] flex-col justify-center gap-0.5 rounded-[14px] border px-4 py-3 text-left transition-colors",
              active
                ? "border-accent bg-accent-wash"
                : "border-line bg-raised hover:border-line-strong",
            )}
          >
            <span
              className={cn(
                "text-[15px] font-medium",
                active ? "text-accent" : "text-ink",
              )}
            >
              {band.label}
            </span>
            <span className="text-[12px] leading-snug text-muted">
              {band.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * ExactCount — optional precision, collapsed by default.
 *
 * Clearing the field sets it back to null rather than to zero, so "I don't
 * count heads" and "the room is empty" stay distinguishable all the way down
 * to the ranker.
 */
function ExactCount({
  value,
  capacity,
  onChange,
}: {
  value: number | null;
  capacity?: number;
  onChange: (pct: number | null) => void;
}) {
  const [open, setOpen] = useState(value !== null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[13px] text-muted">
          Add an exact figure
          <span className="ml-1.5 text-subtle">Optional</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-subtle transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div className="collapsible" data-open={open}>
        <div>
          <div className="space-y-3 pt-1">
            <Field
              label="Percent full"
              hint="Only if you actually count. Shown to guests as small print beside the band, never as the headline."
            >
              {({ id }) => (
                <div className="flex items-center gap-2">
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    placeholder="Not counted"
                    value={value ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      onChange(
                        raw === ""
                          ? null
                          : Math.max(0, Math.min(100, Number(raw))),
                      );
                    }}
                  />
                  {value !== null ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange(null)}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              )}
            </Field>
            {capacity ? (
              <p className="text-[12px] text-muted">
                {value !== null
                  ? `About ${formatNumber(Math.round((value / 100) * capacity))} of ${formatNumber(capacity)} inside.`
                  : `Your capacity is ${formatNumber(capacity)}. Edit it in venue profile.`}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stepper.
 *
 * Chosen over a slider because the input surface is a phone held in one hand in
 * a dark room: a 44px target that changes state by exactly 5 beats a gesture
 * that needs a second look to confirm. The raw number stays editable for people
 * who know exactly what they want.
 */
function Stepper({
  label,
  value,
  suffix,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <p className="text-[22px] font-semibold tabular-nums text-ink">
          {value}
          <span className="text-[14px] font-normal text-muted">{suffix}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
          disabled={value >= max}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
