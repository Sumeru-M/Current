"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Eye, Pause, X } from "lucide-react";
import { APP } from "@/config/app";
import { formatRelativeTime } from "@/lib/format";
import { MediaSurface } from "@/components/domain/media-surface";
import type { Instant } from "@/types";

/**
 * InstantViewer
 *
 * Instagram's interaction model, because it needs zero explanation to either
 * side of the marketplace: tap right to advance, left to go back, hold to
 * pause, auto-advance on a timed bar, Escape to leave.
 *
 * Three deliberate deviations from the reference:
 *  - Progress for a clip is driven by the video's own `timeupdate`, not a
 *    timer. A timer racing a decoding video is how a bar finishes while the
 *    clip is still playing.
 *  - It pauses when the tab is hidden — nobody wants to come back to a
 *    finished instant.
 *  - Full keyboard operation (arrows, space, Escape). Instants are a primary
 *    venue surface, so a manager has to be able to review one on a laptop.
 */
export function InstantViewer({
  instants,
  initialIndex = 0,
  open,
  onClose,
  venueName,
}: {
  instants: Instant[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  venueName: string;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Closing rewinds. Resetting on *open* would need an effect that writes
   * state from a prop — a cascading render. Rewinding on the way out is the
   * same user-visible behaviour without it.
   */
  const close = useCallback(() => {
    setIndex(initialIndex);
    setProgress(0);
    setPaused(false);
    onClose();
  }, [initialIndex, onClose]);

  const advance = useCallback(() => {
    setProgress(0);
    setIndex((current) => {
      if (current + 1 >= instants.length) {
        close();
        return current;
      }
      return current + 1;
    });
  }, [instants.length, close]);

  const back = useCallback(() => {
    setProgress(0);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const instant = instants[Math.min(index, Math.max(0, instants.length - 1))];
  const isVideo = instant?.media.kind === "video" && Boolean(instant.media.url);

  /**
   * Images (and seeded clips with no bytes) advance on a wall-clock timer.
   * Real videos drive their own progress below, so this stays off for them.
   */
  useEffect(() => {
    if (!open || !instants.length || isVideo || paused) return;
    const durationMs =
      (instant?.media.durationSeconds ?? 0) * 1000 || APP.instantDurationMs;
    const tick = 50;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setProgress((value) => {
        const next = value + tick / durationMs;
        if (next >= 1) {
          advance();
          return 0;
        }
        return next;
      });
    }, tick);
    return () => clearInterval(timer);
  }, [open, instants.length, advance, isVideo, paused, instant]);

  /** Keep the <video> element in sync with pause state and instant changes. */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;
    if (paused) el.pause();
    else void el.play().catch(() => undefined);
  }, [paused, isVideo, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") advance();
      if (event.key === "ArrowLeft") back();
      if (event.key === " ") {
        event.preventDefault();
        setPaused((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close, advance, back]);

  if (
    typeof document === "undefined" ||
    !instants.length ||
    !open ||
    !instant
  ) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${venueName} live instants`}
      className="fixed inset-0 z-[70] flex animate-enter-fade items-center justify-center bg-black/95 p-0 sm:p-6"
    >
      <div className="relative h-dvh w-full max-w-md overflow-hidden bg-black sm:h-[80dvh] sm:rounded-[22px]">
        {isVideo ? (
          <video
            ref={videoRef}
            key={instant.id}
            src={instant.media.url}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            aria-label={instant.caption}
            onTimeUpdate={(event) => {
              const el = event.currentTarget;
              if (el.duration > 0) setProgress(el.currentTime / el.duration);
            }}
            onEnded={advance}
          />
        ) : (
          <MediaSurface
            gradient={instant.media.gradient}
            accent={instant.media.accent}
            url={instant.media.url}
            alt={instant.caption}
            intensity="vivid"
            className="absolute inset-0 h-full w-full"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60" />

        {/* Progress */}
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {instants.map((item, i) => (
            <div
              key={item.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <div
                className="h-full bg-white transition-[width] duration-75 ease-linear"
                style={{
                  width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <header className="absolute inset-x-4 top-7 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-white">
              {venueName}
            </p>
            <p className="text-[11px] text-white/60">
              {formatRelativeTime(instant.createdAt)}
              {instant.media.kind === "video" ? " · clip" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-label={paused ? "Resume" : "Pause"}
              aria-pressed={paused}
              className="grid size-9 place-items-center rounded-full bg-black/40 text-white/80 hover:text-white"
            >
              <Pause className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close instants"
              className="grid size-9 place-items-center rounded-full bg-black/40 text-white/80 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        {/* Tap zones */}
        <button
          type="button"
          onClick={back}
          aria-label="Previous instant"
          className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize focus-visible:bg-white/5"
        >
          <ChevronLeft
            className="ml-2 size-5 text-white/0 sm:text-white/30"
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={advance}
          aria-label="Next instant"
          className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize focus-visible:bg-white/5"
        >
          <ChevronRight
            className="ml-auto mr-2 size-5 text-white/0 sm:text-white/30"
            aria-hidden
          />
        </button>

        <footer className="pointer-events-none absolute inset-x-4 bottom-6 space-y-2">
          <p className="text-[15px] leading-relaxed text-white">
            {instant.caption}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Eye className="size-3" aria-hidden />
            {instant.viewCount.toLocaleString("en-IN")} views
          </p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
