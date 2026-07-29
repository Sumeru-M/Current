"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarCheck } from "lucide-react";
import { zodResolver } from "@/lib/zod-resolver";
import { formatMoney } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { useCreateBooking } from "@/hooks/use-domain-queries";
import type { Offer, Venue } from "@/types";

/**
 * Booking hold.
 *
 * "Hold" rather than "confirm" is a product decision, not a technical one: in a
 * pilot we have no payment rails and no guarantee the venue honours it. A hold
 * with a reference the group shows at the door is honest, works with a venue's
 * existing paper list, and is exactly the flow a real integration replaces.
 */
const bookingSchema = z.object({
  guests: z.coerce
    .number<number>()
    .int()
    .min(1, "At least one guest")
    .max(20, "Call the venue for groups over 20"),
  arrival: z.string().min(1, "Pick an arrival time"),
  name: z.string().min(2, "We need a name for the door"),
  phone: z.string().regex(/^[0-9+\s-]{8,15}$/, "Enter a valid phone number"),
});

type BookingValues = z.infer<typeof bookingSchema>;

const ARRIVAL_SLOTS = ["21:00", "22:00", "23:00", "00:00", "01:00"];

export function BookingDialog({
  venue,
  offer,
  open,
  onClose,
}: {
  venue: Venue;
  offer: Offer | null;
  open: boolean;
  onClose: () => void;
}) {
  const createBooking = useCreateBooking();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guests: offer?.minGuests ?? 2,
      arrival: "22:00",
      name: "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const scheduledFor = new Date();
    const [hours, minutes] = values.arrival.split(":").map(Number);
    scheduledFor.setHours(hours, minutes, 0, 0);
    if (hours < 6) scheduledFor.setDate(scheduledFor.getDate() + 1);

    const booking = await createBooking.mutateAsync({
      venueId: venue.id,
      offerId: offer?.id ?? null,
      guests: values.guests,
      scheduledFor: scheduledFor.toISOString(),
    });

    toast.success(
      `Held at ${venue.name}`,
      `Reference ${booking.reference}. Show it at the door before ${values.arrival}.`,
    );
    reset();
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={offer ? offer.name : `Reserve at ${venue.name}`}
      description={
        offer
          ? `${formatMoney(offer.price)} · ${offer.minGuests}–${offer.maxGuests} guests · ${offer.remaining} left`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="booking-form"
            loading={isSubmitting}
          >
            <CalendarCheck className="size-4" aria-hidden />
            Hold this
          </Button>
        </>
      }
    >
      <form
        id="booking-form"
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Guests" error={errors.guests?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("guests")}
              />
            )}
          </Field>

          <Field label="Arriving" error={errors.arrival?.message}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("arrival")}
              >
                {ARRIVAL_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Name for the door" error={errors.name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="name"
              placeholder="Riya Mehta"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("name")}
            />
          )}
        </Field>

        <Field
          label="Phone"
          hint="The venue calls this number if anything changes. Nothing else."
          error={errors.phone?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="tel"
              autoComplete="tel"
              placeholder="+91 98450 11020"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("phone")}
            />
          )}
        </Field>

        <p className="rounded-[10px] border border-line bg-raised px-3 py-2.5 text-[12px] leading-relaxed text-muted">
          This is a hold, not a payment. {venue.name} confirms on arrival and
          releases the {offer?.kind ?? "spot"} if you are more than 30 minutes
          late.
        </p>
      </form>
    </Dialog>
  );
}
