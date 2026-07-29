"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Eye, Save } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@/lib/zod-resolver";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionLabel, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { MediaSurface } from "@/components/domain/media-surface";
import { useUpdateVenue } from "@/hooks/use-domain-queries";
import { getVertical } from "@/config/verticals";
import { useBusinessContext } from "./business-context";

/**
 * Venue profile editor.
 *
 * Validation lives in a Zod schema, not in the inputs, so the same rules can be
 * enforced by the API the day it exists — one schema, two enforcement points,
 * no drift. Every field maps to something the ranker actually reads, and the
 * hints say so: an editor that explains *why* a field matters gets filled in.
 *
 * Brand colour is stored per venue because white-labelled venue pages are a
 * near-term commercial ask; the token system already reads from it.
 */
const profileSchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  tagline: z.string().min(8, "One line that sells the room").max(90),
  description: z.string().min(30, "At least a couple of sentences").max(800),
  neighbourhood: z.string().min(2, "Required"),
  address: z.string().min(6, "Required"),
  agePolicy: z.string().min(2, "Required"),
  dressCode: z.string().min(2, "Required"),
  priceBand: z.coerce.number<number>().int().min(1).max(4),
  capacity: z.coerce
    .number<number>()
    .int()
    .min(10, "Capacity looks too low")
    .max(20000, "Capacity looks too high"),
  musicGenres: z.string().min(2, "At least one genre — this drives matching"),
  brandColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Use a hex colour like #7c5cff"),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function VenueProfileForm() {
  const { activeVenue, activeVenueId } = useBusinessContext();
  const update = useUpdateVenue(activeVenueId ?? "");
  const vertical = getVertical(activeVenue?.verticalId ?? "club");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      neighbourhood: "",
      address: "",
      agePolicy: "",
      dressCode: "",
      priceBand: 2,
      capacity: 200,
      musicGenres: "",
      brandColor: "#7c5cff",
    },
  });

  // Reset from server state when the venue switches.
  useEffect(() => {
    if (!activeVenue) return;
    reset({
      name: activeVenue.name,
      tagline: activeVenue.tagline,
      description: activeVenue.description,
      neighbourhood: activeVenue.neighbourhood,
      address: activeVenue.address,
      agePolicy: activeVenue.agePolicy,
      dressCode: activeVenue.dressCode,
      priceBand: activeVenue.priceBand,
      capacity: activeVenue.capacity,
      musicGenres: (
        (activeVenue.attributes.music_genre as string[]) ?? []
      ).join(", "),
      brandColor: activeVenue.brandColor,
    });
  }, [activeVenue, reset]);

  /**
   * `useWatch` rather than `watch()`: the latter returns a fresh function each
   * render, which opts the whole component out of React Compiler memoisation.
   * Same behaviour, subscription-scoped, and the compiler keeps optimising.
   */
  const brandColor = useWatch({ control, name: "brandColor" });

  if (!activeVenue) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    await update.mutateAsync({
      name: values.name,
      tagline: values.tagline,
      description: values.description,
      neighbourhood: values.neighbourhood,
      address: values.address,
      agePolicy: values.agePolicy,
      dressCode: values.dressCode,
      priceBand: values.priceBand as 1 | 2 | 3 | 4,
      capacity: values.capacity,
      brandColor: values.brandColor,
      attributes: {
        ...activeVenue.attributes,
        music_genre: values.musicGenres
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean),
      },
    });
    reset(values);
    toast.success("Profile updated", "Changes are live in search immediately.");
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
      <PageHeader
        eyebrow="Venue profile"
        title={activeVenue.name}
        subtitle="Everything here feeds the matching engine"
        actions={
          <Link href={`/venue/${activeVenue.id}`}>
            <Button variant="secondary" size="sm">
              <Eye className="size-4" aria-hidden />
              View as guest
            </Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <section className="space-y-3">
          <SectionLabel>Identity</SectionLabel>
          <Card pad="lg" className="space-y-4">
            <Field label="Venue name" error={errors.name?.message}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("name")}
                />
              )}
            </Field>

            <Field
              label="Tagline"
              hint="Shown under your name everywhere. Say what makes the room different."
              error={errors.tagline?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("tagline")}
                />
              )}
            </Field>

            <Field
              label="Description"
              hint="The engine reads this for context. Mention the sound, the room and the crowd."
              error={errors.description?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  className="min-h-32"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("description")}
                />
              )}
            </Field>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Matching</SectionLabel>
          <Card pad="lg" className="space-y-4">
            <Field
              label={`${vertical.attributes[0]?.label ?? "Music"} — comma separated`}
              hint="The single highest-weighted signal in the ranker. Add what you actually play after midnight, not just the headline genre."
              error={errors.musicGenres?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  placeholder="Techno, Minimal, Acid"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("musicGenres")}
                />
              )}
            </Field>

            <Field
              label="Total capacity"
              hint="Shown to guests next to how full you are — it's what makes “Busy” mean something concrete. Update it when your licence changes, not every shift."
              error={errors.capacity?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("capacity")}
                />
              )}
            </Field>

            <Field
              label="Price band"
              hint="Compared against each group's stated budget per person."
              error={errors.priceBand?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("priceBand")}
                >
                  <option value={1}>₹ — Budget</option>
                  <option value={2}>₹₹ — Mid</option>
                  <option value={3}>₹₹₹ — Premium</option>
                  <option value={4}>₹₹₹₹ — Luxury</option>
                </Select>
              )}
            </Field>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Location & policy</SectionLabel>
          <Card pad="lg" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Neighbourhood"
                error={errors.neighbourhood?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("neighbourhood")}
                  />
                )}
              </Field>
              <Field label="Address" error={errors.address?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("address")}
                  />
                )}
              </Field>
              <Field label="Age policy" error={errors.agePolicy?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("agePolicy")}
                  />
                )}
              </Field>
              <Field label="Dress code" error={errors.dressCode?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("dressCode")}
                  />
                )}
              </Field>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Brand</SectionLabel>
          <Card pad="lg" className="space-y-4">
            <Field
              label="Accent colour"
              hint="Used on your map pin and venue accents."
              error={errors.brandColor?.message}
            >
              {({ id, describedBy, invalid }) => (
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="size-9 shrink-0 rounded-[10px] border border-line"
                    style={{
                      backgroundColor: /^#[0-9a-f]{6}$/i.test(brandColor)
                        ? brandColor
                        : "transparent",
                    }}
                  />
                  <Input
                    id={id}
                    className="font-mono"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("brandColor")}
                  />
                </div>
              )}
            </Field>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-ink">Gallery</p>
              <ul className="flex gap-2 overflow-x-auto">
                {activeVenue.media.map((asset) => (
                  <li key={asset.id} className="shrink-0">
                    <MediaSurface
                      gradient={asset.gradient}
                      accent={asset.accent}
                      url={asset.url}
                      alt={asset.alt}
                      className="h-20 w-28 rounded-[10px]"
                    />
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-subtle">
                Media management ships with the storage layer. Ordering, alt
                text and cropping are already modelled on the asset type.
              </p>
            </div>
          </Card>
        </section>

        <div className="flex items-center justify-end gap-3">
          <span className="text-[12px] text-subtle">
            {isDirty ? "Unsaved changes" : "Everything saved"}
          </span>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!isDirty}
          >
            <Save className="size-4" aria-hidden />
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
