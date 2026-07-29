"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import { APP } from "@/config/app";
import { getVertical, ACTIVE_VERTICAL } from "@/config/verticals";
import { useIntentSession } from "@/stores/intent-session";
import { IntentComposer } from "./intent-composer";
import { IntentChips } from "./intent-chips";
import { Clarification } from "./clarification";
import { RecommendationCard } from "@/features/recommendations/recommendation-card";
import { RecommendationSkeletons } from "@/features/recommendations/recommendation-list";

/**
 * IntentCanvas — the landing experience.
 *
 * Empty state is nearly nothing: a line of type, the composer, three seeded
 * prompts. No filters, no categories, no navigation chrome competing with the
 * input. Once a search resolves, the same surface transforms in place into
 * understanding → results, so the user never feels handed off to a "results
 * page". That continuity is what makes it read as a concierge rather than
 * a search engine.
 */
export function IntentCanvas() {
  const router = useRouter();
  const vertical = getVertical(ACTIVE_VERTICAL);
  const status = useIntentSession((s) => s.status);
  const turn = useIntentSession((s) => s.turn);
  const results = useIntentSession((s) => s.results);
  const history = useIntentSession((s) => s.history);
  const submit = useIntentSession((s) => s.submit);

  const hasSession = Boolean(turn);
  const busy = status === "interpreting" || status === "ranking";
  const top = results?.recommendations.slice(0, 3) ?? [];

  return (
    <div className="relative min-h-dvh bg-aurora">
      <div
        className={
          hasSession
            ? "mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12"
            : "mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 pb-16 sm:px-6"
        }
      >
        {/*
          Plain conditional, not AnimatePresence.

          An exit animation on the hero looked good in isolation and cost us a
          correctness bug: with `mode="popLayout"` the exiting node stayed
          mounted and rendered *over* the results. Nothing that gates the
          visibility of primary content should depend on an animation
          completing — the hero leaves instantly, results fade in.
        */}
        {!hasSession ? (
          <div className="mb-7 space-y-3">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[38px]">
              Where are we going
              <br />
              <span className="text-subtle">tonight?</span>
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-muted">
              Say it the way you&apos;d say it to a friend. {APP.name} reads
              what you actually mean and comes back with three places — and why
              each one.
            </p>
          </div>
        ) : null}

        <IntentComposer autoFocus />

        {/* Empty-state seeds. Vertical-owned, so restaurants get their own. */}
        {!hasSession ? (
          <div
            className="mt-4 animate-enter space-y-4"
            style={{ animationDelay: "80ms" }}
          >
            <ul className="flex flex-wrap gap-2">
              {vertical.samplePrompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => void submit(prompt)}
                    className="group flex items-center gap-2 rounded-full border border-line bg-surface/60 py-2 pl-3.5 pr-3 text-[13px] text-muted backdrop-blur transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {prompt}
                    <ArrowRight className="size-3 text-subtle transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>

            {history.length ? (
              <div className="space-y-2 pt-2">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-subtle">
                  <History className="size-3" aria-hidden /> Recent
                </p>
                <ul className="space-y-1">
                  {history.slice(0, 3).map((entry) => (
                    <li key={entry.at}>
                      <button
                        type="button"
                        onClick={() => void submit(entry.utterance)}
                        className="w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-raised hover:text-ink"
                      >
                        {entry.utterance}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Understanding + results */}
        {hasSession && turn ? (
          <div className="mt-6 space-y-5">
            <section aria-live="polite" className="animate-enter space-y-3">
              <p className="text-[15px] font-medium tracking-[-0.01em] text-ink">
                {turn.understanding}
              </p>
              <IntentChips intent={turn.intent} />
            </section>

            {turn.clarification ? <Clarification turn={turn} /> : null}

            {busy ? (
              <RecommendationSkeletons count={2} />
            ) : (
              <div className="space-y-3">
                {top.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    contextLabel={turn.understanding}
                    index={index}
                  />
                ))}

                {results && results.recommendations.length > top.length ? (
                  <button
                    type="button"
                    onClick={() => router.push("/recommendations")}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-line bg-surface/50 py-3 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    See all {results.recommendations.length} matches
                    <ArrowRight className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
