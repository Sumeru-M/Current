/**
 * Speech capture contract.
 *
 * Lives with the other service contracts because dictation is I/O like any
 * other: today it is the browser's own engine, tomorrow it is a hosted model
 * (Whisper, Deepgram, or Wispr Flow's dictation API). Components depend on
 * this interface and never on the engine, so that swap is one file.
 *
 * Modelled as a *streaming* contract rather than "record a blob, get a string
 * back", because the interim transcript is the product: watching your words
 * appear as you speak is what makes a voice interface feel like it is
 * listening rather than buffering. A provider that cannot stream still
 * satisfies this by emitting a single final result.
 */

export type TranscriptionErrorCode =
  | "permission-denied"
  | "no-speech"
  | "network"
  | "unsupported"
  | "aborted"
  | "unknown";

export interface TranscriptionError {
  code: TranscriptionErrorCode;
  /** Written for the person holding the phone, not for a log file. */
  message: string;
  /** Whether tapping the mic again is worth trying. */
  recoverable: boolean;
}

export interface TranscriptionHandlers {
  /** Fired repeatedly as the engine revises its guess. Never final. */
  onInterim: (text: string) => void;
  /** Fired when the engine commits. May arrive shortly after `stop()`. */
  onFinal: (text: string) => void;
  onError: (error: TranscriptionError) => void;
  /** Always fires exactly once, success or failure — where the UI resets. */
  onEnd: () => void;
}

export interface TranscriptionSession {
  /** Stop listening and keep what was heard. */
  stop: () => void;
  /** Stop listening and discard it. */
  abort: () => void;
}

export interface TranscriptionService {
  /**
   * Whether dictation can run here at all. Checked before a mic is rendered,
   * so we never show a control that cannot work — an affordance that fails on
   * tap is worse than one that was never offered.
   */
  isSupported: () => boolean;
  start: (handlers: TranscriptionHandlers) => Promise<TranscriptionSession>;
}
