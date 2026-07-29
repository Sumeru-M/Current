"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/page-header";
import { IntentComposer } from "@/features/intent/intent-composer";
import { IntentChips } from "@/features/intent/intent-chips";
import { useIntentSession } from "@/stores/intent-session";
import { RecommendationList } from "./recommendation-list";
import { formatRelativeTime } from "@/lib/format";

/**
 * The full result set, with the composer kept at the top so refinement never
 * requires navigating back. "Go back and search again" is the interaction that
 * kills every discovery product; here the query is always in reach.
 */
export function RecommendationsScreen() {
  const turn = useIntentSession((s) => s.turn);
  const results = useIntentSession((s) => s.results);

  if (!turn) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="No search yet"
          description="Tell the engine what kind of night you want and results will land here."
          action={
            <Link href="/">
              <Button variant="primary" size="sm">
                Start a search
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
      <PageHeader
        title="Matches"
        subtitle={
          results
            ? `${results.recommendations.length} of ${results.consideredCount} venues · updated ${formatRelativeTime(results.generatedAt)}`
            : undefined
        }
      />

      <div className="space-y-4">
        <IntentComposer placeholder="Refine — 'actually make it eight of us'" />
        <IntentChips intent={turn.intent} />
        <RecommendationList />
      </div>
    </div>
  );
}
