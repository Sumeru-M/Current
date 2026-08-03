import { CalendarClock, MoonStar } from "lucide-react";
import type { RecommendationSet } from "@/types";

/**
 * Says which question the engine actually answered.
 *
 * At 3pm nothing is open, and a silent empty screen reads as a broken product.
 * Falling back to "opening later tonight" is the right answer — but only if we
 * label it. Quietly mixing closed venues into a live result set would be the
 * dishonest version of the same fix.
 */
export function ResultBasisNote({ results }: { results: RecommendationSet }) {
  if (results.basis === "open_now") return null;

  return (
    <div className="flex items-start gap-2.5 rounded-[14px] border border-caution/25 bg-caution-wash px-4 py-3">
      <MoonStar className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
      <div className="space-y-0.5">
        <p className="text-[13px] font-medium text-ink">
          Nothing&apos;s open yet — here&apos;s tonight
        </p>
        <p className="text-[12px] leading-relaxed text-muted">
          These are the closest matches for when doors open. Live queues and
          capacity appear once venues start trading.
        </p>
      </div>
      <CalendarClock
        className="ml-auto mt-0.5 size-4 shrink-0 text-subtle"
        aria-hidden
      />
    </div>
  );
}
