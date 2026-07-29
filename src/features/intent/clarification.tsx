"use client";

import { useIntentSession } from "@/stores/intent-session";
import type { IntentTurn } from "@/types";

/**
 * A single clarifying question, answered in one tap.
 *
 * The rule enforced upstream in the engine: ask at most one, and only when the
 * missing slot would change the ranking. Anything more and the concierge starts
 * behaving like a form.
 */
export function Clarification({ turn }: { turn: IntentTurn }) {
  const refine = useIntentSession((s) => s.refine);
  const clarification = turn.clarification;
  if (!clarification) return null;

  return (
    <section
      aria-label="Clarifying question"
      className="animate-enter rounded-[16px] border border-line bg-surface/60 p-4"
    >
      <p className="text-[13px] text-muted">{clarification.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {clarification.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => void refine(option.patch)}
            className="h-8 rounded-full border border-line bg-raised px-3 text-[13px] text-ink transition-colors hover:border-line-strong hover:bg-overlay"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
