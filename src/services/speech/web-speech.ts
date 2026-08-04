import { APP } from "@/config/app";
import type {
  TranscriptionError,
  TranscriptionHandlers,
  TranscriptionService,
  TranscriptionSession,
} from "./contract";

/**
 * Browser speech engine (Web Speech API).
 *
 * Chosen for the pilot because it is free, needs no backend, and starts
 * returning words in ~200ms — and on a phone outside a club, latency *is* the
 * product. The trade-offs are real and worth stating:
 *
 *  - Accuracy on Indian English proper nouns ("Indiranagar", "Kohra") is
 *    weaker than Whisper. Mitigated by `lang: en-IN` and by the fact that a
 *    misheard word usually still yields the right structured intent — and the
 *    intent chips let a user correct a slot in one tap without re-speaking.
 *  - Chrome streams audio to Google's servers; Safari uses Apple's. Neither is
 *    on-device, which is a privacy fact we should disclose before this ships
 *    to real users.
 *  - iOS Safari does not honour `continuous`, so sessions end on their own
 *    after a pause. That is handled here rather than papered over.
 *
 * When accuracy matters more than latency, a hosted model implements the same
 * contract and this file is deleted.
 */

/* -------------------------------------------------------------------------- */
/* Minimal Web Speech typings — not in lib.dom, and we only use this much.     */
/* -------------------------------------------------------------------------- */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getRecogniser = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Engine error codes are terse and inconsistent; users get a sentence. */
const toError = (raw: string): TranscriptionError => {
  switch (raw) {
    case "not-allowed":
    case "service-not-allowed":
      return {
        code: "permission-denied",
        message:
          "Microphone access is blocked. Enable it in your browser settings, or type instead.",
        recoverable: false,
      };
    case "no-speech":
      return {
        code: "no-speech",
        message: "Didn't catch that. Try again, or type it.",
        recoverable: true,
      };
    case "audio-capture":
      return {
        code: "unsupported",
        message: "No microphone found on this device.",
        recoverable: false,
      };
    case "network":
      return {
        code: "network",
        message: "Speech needs a connection. Type it instead?",
        recoverable: true,
      };
    case "aborted":
      return {
        code: "aborted",
        message: "Stopped listening.",
        recoverable: true,
      };
    default:
      return {
        code: "unknown",
        message: "Something went wrong listening. Try typing instead.",
        recoverable: true,
      };
  }
};

export class WebSpeechTranscriptionService implements TranscriptionService {
  isSupported(): boolean {
    return getRecogniser() !== null;
  }

  async start(handlers: TranscriptionHandlers): Promise<TranscriptionSession> {
    const Recogniser = getRecogniser();
    if (!Recogniser) {
      handlers.onError({
        code: "unsupported",
        message: "This browser can't listen. Type your request instead.",
        recoverable: false,
      });
      handlers.onEnd();
      return { stop: () => {}, abort: () => {} };
    }

    const recognition = new Recogniser();
    recognition.lang = APP.speech.lang;
    recognition.interimResults = true;
    recognition.continuous = APP.speech.continuous;
    recognition.maxAlternatives = 1;

    /**
     * Everything below exists to guarantee `onEnd` fires exactly once and
     * `onFinal` fires at most once. The engine is genuinely inconsistent
     * across browsers — Safari can fire `end` without `result`, Chrome can
     * fire `result` after `stop()` — and a voice UI that occasionally hangs in
     * "listening" is one users stop trusting immediately.
     */
    let settled = false;
    let committed = "";
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const clearGuard = () => {
      if (timeout) clearTimeout(timeout);
      timeout = null;
    };

    const finish = (emitFinal: boolean) => {
      if (settled) return;
      settled = true;
      clearGuard();
      if (emitFinal && committed.trim()) handlers.onFinal(committed.trim());
      handlers.onEnd();
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) committed += text;
        else interim += text;
      }
      const preview = `${committed}${interim}`.trim();
      if (preview) handlers.onInterim(preview);
    };

    recognition.onerror = (event) => {
      const error = toError(event.error);
      // A no-speech timeout after real words is not worth surfacing.
      if (error.code === "no-speech" && committed.trim()) {
        finish(true);
        return;
      }
      if (settled) return;
      settled = true;
      clearGuard();
      handlers.onError(error);
      handlers.onEnd();
    };

    recognition.onend = () => finish(true);

    /**
     * Hard ceiling on a single utterance. Without it, an open mic in a pocket
     * runs until the tab is closed — burning battery, and on metered engines,
     * money.
     */
    timeout = setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        finish(true);
      }
    }, APP.speech.maxUtteranceMs);

    try {
      recognition.start();
    } catch {
      // Thrown when a previous session is still tearing down.
      handlers.onError({
        code: "unknown",
        message: "Still listening to the last one — give it a moment.",
        recoverable: true,
      });
      handlers.onEnd();
      settled = true;
      clearGuard();
    }

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          finish(true);
        }
      },
      abort: () => {
        if (settled) return;
        settled = true;
        clearGuard();
        try {
          recognition.abort();
        } catch {
          /* already gone */
        }
        handlers.onEnd();
      },
    };
  }
}
