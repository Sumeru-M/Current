import type { TranscriptionService } from "./contract";
import { WebSpeechTranscriptionService } from "./web-speech";

/**
 * A service that is always safe to call, even where speech cannot run.
 * Callers check `isSupported()` to decide whether to render a mic; this exists
 * so a stray `start()` can never throw on a server render or an old browser.
 */
class UnsupportedTranscriptionService implements TranscriptionService {
  isSupported() {
    return false;
  }
  async start(handlers: Parameters<TranscriptionService["start"]>[0]) {
    handlers.onError({
      code: "unsupported" as const,
      message: "This device can't listen. Type your request instead.",
      recoverable: false,
    });
    handlers.onEnd();
    return { stop: () => {}, abort: () => {} };
  }
}

export const createTranscriptionService = (): TranscriptionService => {
  if (typeof window === "undefined")
    return new UnsupportedTranscriptionService();
  const web = new WebSpeechTranscriptionService();
  return web.isSupported() ? web : new UnsupportedTranscriptionService();
};

export type * from "./contract";
