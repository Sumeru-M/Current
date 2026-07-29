"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, TriangleAlert, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { useNudges } from "@/hooks/use-domain-queries";
import type { OperationalNudge } from "@/types";

/**
 * NudgeStack
 *
 * The notification system, expressed as opportunity rather than admin. Two
 * rules, both learned from ops tools people actually abandon:
 *
 *  1. Every nudge leads with demand, not with a chore. "125 groups are
 *     searching near you" earns the tap; "Please update your status" does not.
 *  2. Nudges are derived from live state, so a venue that just published sees
 *     "You're fully live" instead of noise. An ops tool that cries wolf gets
 *     muted in week two, and then the data layer dies.
 *
 * Severity maps to visual weight only — nothing here blocks the screen.
 */
const SEVERITY = {
  urgent: {
    icon: TriangleAlert,
    card: "border-caution/30 bg-caution-wash",
    icon_tone: "text-caution",
  },
  opportunity: {
    icon: Zap,
    card: "border-accent/25 bg-accent-wash",
    icon_tone: "text-accent",
  },
  info: {
    icon: Sparkles,
    card: "border-line bg-surface",
    icon_tone: "text-positive",
  },
} as const;

export function NudgeStack({
  venueId,
  limit = 2,
}: {
  venueId: string;
  limit?: number;
}) {
  const { data: nudges = [] } = useNudges(venueId);
  const shown = nudges.slice(0, limit);

  return (
    <ul className="space-y-2" aria-label="Operational suggestions">
      {shown.map((nudge) => (
        <NudgeCard key={nudge.id} nudge={nudge} />
      ))}
    </ul>
  );
}

function NudgeCard({ nudge }: { nudge: OperationalNudge }) {
  const config = SEVERITY[nudge.severity];
  const Icon = config.icon;

  return (
    <li
      className={cn(
        "flex animate-enter items-start gap-3 rounded-[14px] border px-4 py-3.5",
        config.card,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", config.icon_tone)}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[13px] font-medium text-ink">{nudge.title}</p>
        <p className="text-[12px] leading-relaxed text-muted">{nudge.body}</p>
      </div>
      {nudge.action ? (
        <Link
          href={nudge.action.href}
          className="group mt-0.5 flex shrink-0 items-center gap-1 text-[12px] font-medium text-accent"
        >
          {nudge.action.label}
          <ArrowRight
            className="size-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </li>
  );
}
