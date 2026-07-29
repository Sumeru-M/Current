"use client";

import { create } from "zustand";
import { ACTIVE_VERTICAL } from "@/config/verticals";
import { services } from "@/services";
import type {
  Intent,
  IntentTurn,
  RecommendationSet,
  VerticalId,
} from "@/types";

/**
 * Intent session store.
 *
 * Why Zustand rather than TanStack Query for this slice: the conversation is
 * *client state*, not server cache. It is sequential, user-owned, and must
 * survive navigation between Home → Recommendations → Venue → back without a
 * refetch or a flash of empty. Modelling it as a query would mean fighting the
 * cache to keep a mutable draft; modelling it as React context would re-render
 * every consumer on every keystroke.
 *
 * The store holds *state*, and orchestrates the two services in the correct
 * order (interpret → rank). Components dispatch intent; they never sequence it.
 */

type Status = "idle" | "interpreting" | "ranking" | "ready" | "error";

interface IntentSessionState {
  verticalId: VerticalId;
  status: Status;
  turn: IntentTurn | null;
  results: RecommendationSet | null;
  history: { utterance: string; at: string }[];
  error: string | null;

  submit: (utterance: string) => Promise<void>;
  /** Apply a structured edit (chip removal, clarification answer) and re-rank. */
  refine: (patch: Partial<Intent>) => Promise<void>;
  reset: () => void;
}

const rankFor = async (intent: Intent) =>
  services().recommendations.rank({ intent });

export const useIntentSession = create<IntentSessionState>((set, get) => ({
  verticalId: ACTIVE_VERTICAL,
  status: "idle",
  turn: null,
  results: null,
  history: [],
  error: null,

  submit: async (utterance) => {
    const trimmed = utterance.trim();
    if (!trimmed) return;

    set({ status: "interpreting", error: null });
    try {
      const turn = await services().intent.interpret({
        utterance: trimmed,
        verticalId: get().verticalId,
        previous: get().turn?.intent ?? null,
      });

      set((state) => ({
        turn,
        status: "ranking",
        history: [
          { utterance: trimmed, at: turn.createdAt },
          ...state.history,
        ].slice(0, 8),
      }));

      const results = await rankFor(turn.intent);
      set({ results, status: "ready" });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not read that. Try rephrasing.",
      });
    }
  },

  refine: async (patch) => {
    const current = get().turn;
    if (!current) return;

    const intent: Intent = { ...current.intent, ...patch };
    set({
      status: "ranking",
      turn: { ...current, intent, clarification: null },
      error: null,
    });

    try {
      const results = await rankFor(intent);
      set({ results, status: "ready" });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Could not re-rank.",
      });
    }
  },

  reset: () => set({ status: "idle", turn: null, results: null, error: null }),
}));
