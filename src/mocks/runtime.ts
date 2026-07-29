import { APP } from "@/config/app";

/**
 * Deterministic pseudo-random source.
 *
 * `Math.random` would make every demo render differently and every screenshot
 * unreproducible. A seeded mulberry32 gives us data that looks organic but is
 * identical on every machine — which matters when you are pitching and when you
 * are diffing visual regressions.
 */
export const createRng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stable hash so a given venue id always yields the same "random" telemetry. */
export const hashString = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Simulated network latency — loading states must be exercised, not hidden. */
export const latency = (): Promise<void> => {
  const { min, max } = APP.mockLatency;
  const rng = createRng(Date.now() & 0xffff);
  const ms = min + rng() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const nowIso = (): string => new Date().toISOString();

export const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export const minutesFromNow = (minutes: number): string =>
  new Date(Date.now() + minutes * 60_000).toISOString();

export const pick = <T>(items: readonly T[], rng: () => number): T =>
  items[Math.floor(rng() * items.length)] as T;

export const uid = (prefix: string): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
