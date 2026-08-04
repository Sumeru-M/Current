"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { services } from "@/services";
import type {
  TranscriptionError,
  TranscriptionSession,
} from "@/services/speech/contract";

/**
 * Dictation state machine.
 *
 * Explicit states rather than a pile of booleans, because every ambiguous
 * combination in a voice UI is a bug someone will hit: listening-and-error,
 * stopped-but-still-showing-a-waveform, two sessions open at once. A single
 * `state` makes those unrepresentable.
 *
 *   idle → starting → listening → finalising → idle
 *                  ↘ error/denied ↘ idle
 */
export type DictationState =
  "idle" | "starting" | "listening" | "finalising" | "error";

/**
 * Whether this device can listen.
 *
 * `useSyncExternalStore` rather than a render-time check, because the answer
 * genuinely differs between server and client — the server has no `window`, so
 * a naive check renders a text field on the server and a microphone on the
 * client, and React tears the tree down with a hydration error.
 *
 * The server snapshot is optimistic (`true`): virtually every phone browser we
 * target supports speech, so assuming yes avoids a visible flash of the typing
 * UI for almost everyone, and the rare unsupported desktop browser silently
 * settles on the keyboard a frame later.
 */
const subscribe = () => () => {};

export function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => services().speech.isSupported(),
    () => true,
  );
}

interface UseDictationOptions {
  /** Called once with the committed transcript. */
  onResult: (transcript: string) => void;
  /** Called on every revision while speaking, for live display. */
  onInterim?: (transcript: string) => void;
}

export function useDictation({ onResult, onInterim }: UseDictationOptions) {
  const [state, setState] = useState<DictationState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<TranscriptionError | null>(null);

  const sessionRef = useRef<TranscriptionSession | null>(null);
  /**
   * Callbacks are held in refs so the engine's handlers always see the latest
   * closure without needing to tear down and restart a live session mid-speech.
   */
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;
  }, [onResult, onInterim]);

  const supported = useSpeechSupported();

  /** Never leave a microphone open because a user navigated away. */
  useEffect(
    () => () => {
      sessionRef.current?.abort();
      sessionRef.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    if (!sessionRef.current) return;
    setState("finalising");
    sessionRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    sessionRef.current?.abort();
    sessionRef.current = null;
    setInterim("");
    setError(null);
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setInterim("");
    setState("starting");

    let gotResult = false;

    const session = await services().speech.start({
      onInterim: (text) => {
        setState("listening");
        setInterim(text);
        onInterimRef.current?.(text);
      },
      onFinal: (text) => {
        gotResult = true;
        setInterim("");
        onResultRef.current(text);
      },
      onError: (nextError) => {
        setError(nextError);
        setState("error");
      },
      onEnd: () => {
        sessionRef.current = null;
        setInterim("");
        // An error already moved us to `error`; don't overwrite that state.
        setState((current) =>
          current === "error" ? current : gotResult ? "idle" : "idle",
        );
      },
    });

    sessionRef.current = session;
    // `starting` only advances to `listening` on first audio, so the button
    // shows a genuine "connecting" beat instead of lying about hearing you.
    setState((current) => (current === "starting" ? "listening" : current));
  }, []);

  const toggle = useCallback(() => {
    if (state === "listening" || state === "starting") stop();
    else void start();
  }, [state, start, stop]);

  return {
    supported,
    state,
    interim,
    error,
    isActive: state === "starting" || state === "listening",
    start,
    stop,
    cancel,
    toggle,
  };
}
