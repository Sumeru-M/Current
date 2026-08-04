"use client";

import { Keyboard, Mic, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import { useIntentSession } from "@/stores/intent-session";
import { useDictation } from "./use-dictation";

/**
 * VoiceCapture — the primary way into the product on a phone.
 *
 * Why voice leads: the user is standing outside, in the dark, probably holding
 * a drink, deciding with five other people. Typing "six of us, techno, under
 * ₹3,000 each" on a phone keyboard takes ~20 seconds and real attention.
 * Saying it takes four seconds and none.
 *
 * Interaction decisions:
 *  - **Tap to start, tap to stop** — not press-and-hold. Holding a phone
 *    steady while talking over music is awkward, and a hold gesture that
 *    slips loses the whole utterance. A visible Stop is also the only design
 *    that works one-handed.
 *  - **The transcript is shown live.** A mic that gives no feedback until it
 *    finishes reads as broken. Seeing your words appear is the entire signal
 *    that it is working.
 *  - **It submits itself.** The value proposition is a decision in under 30
 *    seconds; making someone speak and *then* press a send button wastes the
 *    thing voice just saved. Misheard words are recoverable through the intent
 *    chips, which is a one-tap fix rather than a re-record.
 *  - **Typing is never hidden.** Voice fails in loud rooms — which is exactly
 *    where this app is used — so the keyboard is always one tap away, not
 *    buried behind a failure state.
 */
export function VoiceCapture({
  onSwitchToTyping,
  className,
}: {
  onSwitchToTyping: () => void;
  className?: string;
}) {
  const submit = useIntentSession((s) => s.submit);
  const busy = useIntentSession(
    (s) => s.status === "interpreting" || s.status === "ranking",
  );

  const dictation = useDictation({
    onResult: (transcript) => {
      void submit(transcript);
    },
  });

  // No mic engine here: don't render a control that cannot work.
  if (!dictation.supported) return null;

  const { state, interim, error, isActive } = dictation;

  const label =
    state === "starting"
      ? "Listening…"
      : state === "listening"
        ? "Listening — tap to stop"
        : state === "finalising"
          ? "Got it…"
          : "Tap and just say it";

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative">
        {/* Pulse rings are decoration only — CSS, and gone under reduced motion. */}
        {isActive ? (
          <>
            <span className="absolute inset-0 animate-listening rounded-full bg-accent/25" />
            <span
              className="absolute inset-0 animate-listening rounded-full bg-accent/20"
              style={{ animationDelay: "0.6s" }}
            />
          </>
        ) : null}

        <button
          type="button"
          onClick={dictation.toggle}
          disabled={busy}
          aria-pressed={isActive}
          aria-label={isActive ? "Stop listening" : "Speak your request"}
          className={cn(
            "relative grid size-24 place-items-center rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50",
            isActive
              ? "bg-accent text-on-accent shadow-[0_0_40px_-6px_var(--color-accent)]"
              : "bg-raised text-ink ring-1 ring-line-strong hover:bg-overlay hover:ring-accent/50",
          )}
        >
          {isActive ? (
            <Square className="size-7 fill-current" aria-hidden />
          ) : (
            <Mic className="size-8" aria-hidden />
          )}
        </button>
      </div>

      {/* One live region for the whole control — screen readers get the same
          running feedback sighted users get from the transcript. */}
      <div className="min-h-16 w-full max-w-md text-center" aria-live="polite">
        {error ? (
          <p className="text-[14px] leading-relaxed text-critical">
            {error.message}
          </p>
        ) : interim ? (
          <p className="text-[17px] leading-snug text-ink">
            {interim}
            <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-accent" />
          </p>
        ) : (
          <p
            className={cn(
              "text-[15px] transition-colors",
              isActive ? "text-accent" : "text-muted",
            )}
          >
            {label}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          dictation.cancel();
          onSwitchToTyping();
        }}
        className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        <Keyboard className="size-3.5" aria-hidden />
        Type it instead
      </button>
    </div>
  );
}

/**
 * Compact mic for the composer, used for refinements once results exist
 * ("actually make it eight of us"). Dictating a correction is the single
 * highest-value voice moment in the app — it is short, conversational, and
 * the alternative is re-typing a sentence.
 */
export function VoiceButton({
  onTranscript,
  className,
}: {
  onTranscript: (text: string) => void;
  className?: string;
}) {
  const dictation = useDictation({ onResult: onTranscript });
  if (!dictation.supported) return null;

  return (
    <button
      type="button"
      onClick={dictation.toggle}
      aria-pressed={dictation.isActive}
      aria-label={
        dictation.isActive ? "Stop listening" : "Speak instead of typing"
      }
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[14px] transition-colors",
        dictation.isActive
          ? "bg-accent text-on-accent"
          : "text-subtle hover:bg-raised hover:text-ink",
        className,
      )}
    >
      {dictation.isActive ? (
        <Square className="size-3.5 fill-current" aria-hidden />
      ) : (
        <Mic className="size-4" aria-hidden />
      )}
    </button>
  );
}
