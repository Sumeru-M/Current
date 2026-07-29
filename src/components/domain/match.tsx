"use client";

import { useState } from "react";
import {
  ChevronDown,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { MatchExplanation, MatchFactor } from "@/types";

/**
 * Match explanation UI.
 *
 * The score ring is intentionally *not* the hero. The headline claim is. A
 * number invites comparison shopping between venues; a reason answers the
 * question the group is actually asking ("why this one?"). The number is there
 * for people who want it, at the size it deserves.
 */

export function MatchScore({
  score,
  size = 44,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${score} out of 100 match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={2.5}
          className="stroke-line"
        />
        {/*
          The arc is drawn at its final value and eased in with a CSS
          transition on mount. Same feel, and the ring can never be caught
          mid-tween showing a score that isn't the real one.
        */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums text-ink"
        style={{ fontSize: size * 0.3 }}
      >
        {score}
      </span>
    </div>
  );
}

export function MatchHeadline({
  match,
  className,
}: {
  match: MatchExplanation;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-[13px] leading-relaxed text-muted",
        className,
      )}
    >
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
      <span className="text-ink/90">{match.headline}</span>
    </p>
  );
}

const POLARITY_ICON = {
  positive: TrendingUp,
  neutral: Minus,
  negative: TrendingDown,
} as const;

const POLARITY_TONE = {
  positive: "text-positive",
  neutral: "text-subtle",
  negative: "text-critical",
} as const;

export function MatchFactorRow({ factor }: { factor: MatchFactor }) {
  const Icon = POLARITY_ICON[factor.polarity];
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          POLARITY_TONE[factor.polarity],
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-ink/90">{factor.claim}</p>
        <p className="text-[11px] uppercase tracking-[0.1em] text-subtle">
          {factor.label}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-[12px] font-medium tabular-nums",
          factor.contribution > 0 ? "text-muted" : "text-critical",
        )}
      >
        {factor.contribution > 0 ? "+" : ""}
        {factor.contribution}
      </span>
    </li>
  );
}

/**
 * Expandable breakdown. Collapsed by default — the average user wants the
 * headline; the sceptical user (and every venue owner in a pilot meeting)
 * wants the maths. Both are one tap away.
 */
export function MatchBreakdown({ match }: { match: MatchExplanation }) {
  const [open, setOpen] = useState(false);
  const shown = match.factors.filter(
    (f) => f.contribution !== 0 || f.polarity === "negative",
  );

  return (
    <div className="rounded-[12px] border border-line bg-canvas/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="text-[12px] font-medium text-muted">
          How this scored {match.score}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-subtle transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {/* Height-auto expansion via the CSS grid-rows technique — no measuring. */}
      <div className="collapsible" data-open={open}>
        <div>
          <ul className="divide-y divide-line border-t border-line px-3.5 py-1">
            {shown.map((factor) => (
              <MatchFactorRow key={factor.id} factor={factor} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
