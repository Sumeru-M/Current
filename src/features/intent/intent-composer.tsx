"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useIntentSession } from "@/stores/intent-session";

/**
 * IntentComposer
 *
 * The product's front door. Deliberately *not* a chat input:
 *
 *  - No message history above it. The user's words are read back as structured
 *    intent chips, not as a transcript — the AI's job is to be understood, not
 *    to be conversational.
 *  - It grows to fit the sentence, then stops. Enter submits; Shift+Enter is a
 *    newline, matching every serious composer (Linear, Slack, Notion).
 *  - Suggestions live below the input and disappear the moment the user types.
 *
 * Trade-off: a transcript would make multi-turn refinement more legible. We buy
 * clarity and speed instead, and recover refinement through editable chips —
 * which are faster to correct than re-typing a sentence anyway.
 */
/** Roughly six lines — beyond that the composer scrolls instead of growing. */
const MAX_COMPOSER_HEIGHT = 168;

export function IntentComposer({
  autoFocus = false,
  placeholder = "Six of us, techno, under ₹3,000 each…",
  className,
}: {
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submit = useIntentSession((s) => s.submit);
  const status = useIntentSession((s) => s.status);
  const busy = status === "interpreting" || status === "ranking";

  /**
   * Autosize without a layout library: collapse, measure, grow — capped.
   *
   * Measured inside rAF rather than synchronously in the effect. On first mount
   * the effect can run before the webfont and Tailwind layer have settled, and
   * a `scrollHeight` read in that window returns a bogus value that then sticks
   * as an inline style. One frame later the box model is real.
   */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const handleSubmit = async () => {
    if (!value.trim() || busy) return;
    const utterance = value;
    setValue("");
    await submit(utterance);
  };

  return (
    <form
      className={cn("group relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-[20px] border bg-surface/80 p-2 pl-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_20px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors focus-within:border-line-strong",
          busy ? "border-accent" : "border-line",
        )}
      >
        <label htmlFor="intent-input" className="sr-only">
          Describe the night you want
        </label>
        <textarea
          id="intent-input"
          ref={textareaRef}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          disabled={busy}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={placeholder}
          aria-describedby="intent-hint"
          className="h-11 flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-subtle disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!value.trim() || busy}
          aria-label="Find places"
          className={cn(
            "mb-0.5 grid size-9 shrink-0 place-items-center rounded-[14px] transition-all",
            value.trim() && !busy
              ? "bg-accent text-on-accent hover:bg-accent-hover"
              : "bg-raised text-subtle",
          )}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="size-4" aria-hidden />
          )}
        </button>
      </div>
      <p id="intent-hint" className="sr-only">
        Describe what you want in plain language. Press Enter to search, Shift
        and Enter for a new line.
      </p>
    </form>
  );
}
