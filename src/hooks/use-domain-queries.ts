"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APP } from "@/config/app";
import { services } from "@/services";
import { qk } from "@/services/query-keys";
import type { AnalyticsRange, Availability, Venue, VerticalId } from "@/types";

/**
 * Query hooks.
 *
 * Components never call `services()` directly — they call a hook. That keeps
 * cache policy (stale times, poll intervals, invalidation fan-out) in one
 * reviewable place rather than sprinkled through JSX, and it means a change to
 * how often live data refreshes is a one-line edit here.
 */

export const useVenue = (venueId: string | undefined) =>
  useQuery({
    queryKey: qk.venues.detail(venueId ?? ""),
    queryFn: () => services().venues.get(venueId!),
    enabled: Boolean(venueId),
  });

export const useVenues = (verticalId: VerticalId) =>
  useQuery({
    queryKey: qk.venues.list(verticalId),
    queryFn: () => services().venues.list(verticalId),
  });

export const useOffers = (venueId: string | undefined) =>
  useQuery({
    queryKey: qk.venues.offers(venueId ?? ""),
    queryFn: () => services().venues.offers(venueId!),
    enabled: Boolean(venueId),
  });

/**
 * Live availability. Short staleTime + interval polling is the right primitive
 * here: it is the simplest thing that meets the "<20s" product requirement, it
 * degrades gracefully on bad mobile networks, and it survives tab suspension.
 *
 * Alternative considered: WebSockets/SSE. Correct eventually — a venue with
 * 4,000 concurrent viewers should not be polled 4,000 times — but it requires
 * backend infrastructure that does not exist yet, and TanStack Query lets us
 * swap the transport under these same hooks later without touching components.
 */
export const useAvailability = (venueId: string | undefined) =>
  useQuery({
    queryKey: qk.availability.detail(venueId ?? ""),
    queryFn: () => services().availability.get(venueId!),
    enabled: Boolean(venueId),
    refetchInterval: APP.liveRefetchMs,
    staleTime: APP.liveRefetchMs / 2,
  });

export const useAvailabilityMany = (venueIds: string[]) =>
  useQuery({
    queryKey: qk.availability.many(venueIds),
    queryFn: () => services().availability.getMany(venueIds),
    enabled: venueIds.length > 0,
    refetchInterval: APP.liveRefetchMs,
    staleTime: APP.liveRefetchMs / 2,
  });

export const useInstants = (venueId: string | undefined) =>
  useQuery({
    queryKey: qk.instants.forVenue(venueId ?? ""),
    queryFn: () => services().instants.listForVenue(venueId!),
    enabled: Boolean(venueId),
    refetchInterval: APP.liveRefetchMs * 4,
  });

export const useSimilarVenues = (venueId: string | undefined) =>
  useQuery({
    queryKey: qk.recommendations.similar(venueId ?? ""),
    queryFn: () => services().recommendations.similarTo(venueId!),
    enabled: Boolean(venueId),
  });

export const useAnalytics = (
  venueId: string | undefined,
  range: AnalyticsRange,
) =>
  useQuery({
    queryKey: qk.analytics.summary(venueId ?? "", range),
    queryFn: () => services().analytics.summary(venueId!, range),
    enabled: Boolean(venueId),
  });

export const useNudges = (venueId: string | undefined) =>
  useQuery({
    queryKey: qk.analytics.nudges(venueId ?? ""),
    queryFn: () => services().analytics.nudges(venueId!),
    enabled: Boolean(venueId),
    refetchInterval: APP.liveRefetchMs * 3,
  });

export const useBusiness = () =>
  useQuery({
    queryKey: qk.business.current,
    queryFn: () => services().business.current(),
  });

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Live status publish.
 *
 * Optimistic by design. A doorman updating a queue count on a phone in a loud
 * room must see the change land instantly; waiting 400ms for a round trip makes
 * the tool feel broken and they stop using it — which kills the data quality
 * the whole recommendation engine depends on. Rollback on error is wired.
 */
export const useUpdateAvailability = (venueId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Availability>) =>
      services().availability.update(venueId, patch),
    onMutate: async (patch) => {
      const key = qk.availability.detail(venueId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Availability>(key);
      if (previous) {
        client.setQueryData<Availability>(key, {
          ...previous,
          ...patch,
          updatedAt: new Date().toISOString(),
          updatedBy: "You",
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        client.setQueryData(qk.availability.detail(venueId), context.previous);
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: qk.availability.all });
      client.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
};

export const useUpdateVenue = (venueId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Venue>) =>
      services().venues.update(venueId, patch),
    onSuccess: (venue) => {
      client.setQueryData(qk.venues.detail(venueId), venue);
      client.invalidateQueries({ queryKey: qk.venues.all });
    },
  });
};

export const useCreateInstant = (venueId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<ReturnType<typeof services>["instants"]["create"]>[0],
    ) => services().instants.create(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.instants.forVenue(venueId) });
      client.invalidateQueries({ queryKey: qk.analytics.nudges(venueId) });
    },
  });
};

export const useRemoveInstant = (venueId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (instantId: string) => services().instants.remove(instantId),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: qk.instants.forVenue(venueId) }),
  });
};

export const useCreateBooking = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<ReturnType<typeof services>["bookings"]["hold"]>[0],
    ) => services().bookings.hold(input),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.bookings.all }),
  });
};

export const useBookings = () =>
  useQuery({
    queryKey: qk.bookings.all,
    queryFn: () => services().bookings.list(),
  });
