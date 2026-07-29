"use client";

import { X } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useIntentSession } from "@/stores/intent-session";
import type { Intent } from "@/types";
import { cn } from "@/lib/cn";

/**
 * IntentChips
 *
 * The AI's understanding, rendered as *editable state* rather than as a
 * sentence it wrote back at you. This is the single most important interaction
 * in the consumer app: it makes an opaque model legible, it lets a user correct
 * a misread in one tap instead of retyping, and it proves to a sceptical
 * partner that the system extracted structure rather than doing keyword search.
 *
 * Removing a chip clears that slot and re-ranks immediately.
 */

interface ChipSpec {
  key: keyof Intent;
  label: string;
  clear: Partial<Intent>;
}

const buildChips = (intent: Intent): ChipSpec[] => {
  const chips: ChipSpec[] = [];

  if (intent.groupSize !== null) {
    chips.push({
      key: "groupSize",
      label: intent.groupSize === 1 ? "Just me" : `${intent.groupSize} people`,
      clear: { groupSize: null },
    });
  }
  if (intent.budgetPerPerson !== null) {
    chips.push({
      key: "budgetPerPerson",
      label: `${formatMoney({ amount: intent.budgetPerPerson, currency: "INR" })} each`,
      clear: { budgetPerPerson: null },
    });
  }
  for (const vibe of intent.vibes) {
    chips.push({
      key: "vibes",
      label: vibe,
      clear: { vibes: intent.vibes.filter((v) => v !== vibe) },
    });
  }
  if (intent.maxQueueMinutes !== null) {
    chips.push({
      key: "maxQueueMinutes",
      label: `Under ${intent.maxQueueMinutes} min queue`,
      clear: { maxQueueMinutes: null },
    });
  }
  if (intent.maxTravelMinutes !== null) {
    chips.push({
      key: "maxTravelMinutes",
      label: `Within ${intent.maxTravelMinutes} min`,
      clear: { maxTravelMinutes: null },
    });
  }
  if (intent.neighbourhood) {
    chips.push({
      key: "neighbourhood",
      label: intent.neighbourhood,
      clear: { neighbourhood: null },
    });
  }
  if (intent.timing) {
    const timingCopy: Record<NonNullable<Intent["timing"]>, string> = {
      now: "Right now",
      tonight: "Tonight",
      later_tonight: "Later tonight",
      weekend: "This weekend",
      planning: "Planning ahead",
    };
    chips.push({
      key: "timing",
      label: timingCopy[intent.timing],
      clear: { timing: null },
    });
  }
  for (const requirement of intent.requirements) {
    chips.push({
      key: "requirements",
      label: requirement,
      clear: {
        requirements: intent.requirements.filter((r) => r !== requirement),
      },
    });
  }

  return chips;
};

export function IntentChips({
  intent,
  className,
}: {
  intent: Intent;
  className?: string;
}) {
  const refine = useIntentSession((s) => s.refine);
  const chips = buildChips(intent);

  if (!chips.length) return null;

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Detected intent"
    >
      {chips.map((chip) => (
        <li
          key={`${String(chip.key)}-${chip.label}`}
          className="animate-enter-scale"
        >
          <button
            type="button"
            onClick={() => void refine(chip.clear)}
            className="group flex h-7 items-center gap-1.5 rounded-full border border-accent/25 bg-accent-wash pl-2.5 pr-1.5 text-xs text-accent transition-colors hover:border-accent/50"
          >
            {chip.label}
            <X
              className="size-3 text-accent/50 transition-colors group-hover:text-accent"
              aria-hidden
            />
            <span className="sr-only">Remove {chip.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
