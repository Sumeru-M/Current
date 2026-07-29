"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS } from "@/config/app";
import type { SavedVenue } from "@/types";

/**
 * Saved venues.
 *
 * Persisted, unlike the simulation state, because this is real user data — a
 * demo where the saved list survives a refresh reads as a real product. When
 * accounts exist this store becomes the optimistic cache in front of a
 * `SavedService`; the component API (`isSaved`, `toggle`) does not change.
 */
interface SavedState {
  items: SavedVenue[];
  toggle: (venueId: string, contextLabel?: string | null) => void;
  remove: (venueId: string) => void;
  isSaved: (venueId: string) => boolean;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (venueId, contextLabel = null) =>
        set((state) => {
          const exists = state.items.some((item) => item.venueId === venueId);
          return {
            items: exists
              ? state.items.filter((item) => item.venueId !== venueId)
              : [
                  { venueId, savedAt: new Date().toISOString(), contextLabel },
                  ...state.items,
                ],
          };
        }),
      remove: (venueId) =>
        set((state) => ({
          items: state.items.filter((item) => item.venueId !== venueId),
        })),
      isSaved: (venueId) =>
        get().items.some((item) => item.venueId === venueId),
    }),
    {
      name: STORAGE_KEYS.saved,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
