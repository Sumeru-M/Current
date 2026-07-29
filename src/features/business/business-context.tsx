"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/config/app";
import { useBusiness, useVenues } from "@/hooks/use-domain-queries";
import { ACTIVE_VERTICAL } from "@/config/verticals";
import type { Business, Venue } from "@/types";

/**
 * Business context.
 *
 * "Which venue am I editing?" is genuine cross-cutting UI state — it is read by
 * the sidebar, every page, and every mutation. Context is the right tool here
 * (unlike the intent session, which is high-frequency and belongs in a store):
 * it changes rarely, and prop-drilling it through five route levels would be
 * worse than a re-render nobody will ever notice.
 *
 * Selection persists per-browser so a manager who lives on one room does not
 * re-pick it every shift.
 */
interface BusinessContextValue {
  business: Business | undefined;
  venues: Venue[];
  activeVenueId: string | undefined;
  activeVenue: Venue | undefined;
  setActiveVenueId: (venueId: string) => void;
  isLoading: boolean;
}

const Context = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: allVenues, isLoading: venuesLoading } =
    useVenues(ACTIVE_VERTICAL);
  /**
   * Read the stored preference once, lazily. Selection is then *derived*
   * during render rather than synchronised in an effect — venues arrive
   * asynchronously, and an effect-based default would render one frame with no
   * venue selected and cascade an extra render every time the list settles.
   */
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    typeof window === "undefined"
      ? undefined
      : (localStorage.getItem(STORAGE_KEYS.activeVenue) ?? undefined),
  );

  /** Only venues this business actually operates are manageable. */
  const venues = useMemo(
    () =>
      (allVenues ?? []).filter((venue) =>
        business?.venueIds.includes(venue.id),
      ),
    [allVenues, business],
  );

  const value = useMemo<BusinessContextValue>(() => {
    const activeVenueId = venues.some((venue) => venue.id === selectedId)
      ? selectedId
      : venues[0]?.id;

    return {
      business,
      venues,
      activeVenueId,
      activeVenue: venues.find((venue) => venue.id === activeVenueId),
      setActiveVenueId: (venueId: string) => {
        setSelectedId(venueId);
        localStorage.setItem(STORAGE_KEYS.activeVenue, venueId);
      },
      isLoading: businessLoading || venuesLoading,
    };
  }, [business, venues, selectedId, businessLoading, venuesLoading]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBusinessContext(): BusinessContextValue {
  const context = useContext(Context);
  if (!context)
    throw new Error(
      "useBusinessContext must be used inside <BusinessProvider>",
    );
  return context;
}
