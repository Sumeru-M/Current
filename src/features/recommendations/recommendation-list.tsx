"use client";

import { SearchX, Sparkles } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useIntentSession } from "@/stores/intent-session";
import { RecommendationCard } from "./recommendation-card";
import { ResultBasisNote } from "./result-basis-note";

/**
 * Owns every state a result set can be in: loading, error, empty, ready.
 * Feature screens compose this and never re-implement a spinner — which is how
 * loading states stay consistent across an app as it grows.
 */
export function RecommendationList({ compact = false }: { compact?: boolean }) {
  const status = useIntentSession((s) => s.status);
  const results = useIntentSession((s) => s.results);
  const turn = useIntentSession((s) => s.turn);
  const error = useIntentSession((s) => s.error);
  const reset = useIntentSession((s) => s.reset);

  if (status === "error") {
    return <ErrorState description={error ?? undefined} onRetry={reset} />;
  }

  if (status === "interpreting" || status === "ranking") {
    return <RecommendationSkeletons count={compact ? 2 : 3} />;
  }

  if (!results) {
    return (
      <EmptyState
        icon={<Sparkles className="size-6" />}
        title="Nothing searched yet"
        description="Describe the night you want and the engine will do the rest."
      />
    );
  }

  if (!results.recommendations.length) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" />}
        title="Nothing open matches that"
        description="Every venue is either closed or outside your constraints. Loosen the budget or the queue limit and try again."
        action={
          <Button variant="secondary" size="sm" onClick={reset}>
            Start over
          </Button>
        }
      />
    );
  }

  const contextLabel = turn?.understanding ?? null;

  return (
    <div className="space-y-3">
      <ResultBasisNote results={results} />
      {results.recommendations.map((recommendation, index) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          contextLabel={contextLabel}
          index={index}
        />
      ))}
      <p className="pt-1 text-center text-[12px] text-subtle">
        Ranked {results.recommendations.length} of {results.consideredCount}{" "}
        open venues nearby
      </p>
    </div>
  );
}

export function RecommendationSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Finding places">
      <span className="sr-only">Finding places that match</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface"
        >
          <Skeleton className="h-40 w-full rounded-none sm:h-48" />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="size-11 rounded-full" />
            </div>
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-12 w-full rounded-[12px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
