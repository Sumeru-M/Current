import { APP } from "@/config/app";
import type { Freshness, Money } from "@/types";

/**
 * Formatting lives in one module so currency, distance and time read
 * identically in the consumer app and the business portal. Locale is threaded
 * through rather than hardcoded, so an expansion to Dubai or London is a prop.
 */

const CURRENCY_LOCALE: Record<Money["currency"], string> = {
  INR: "en-IN",
  USD: "en-US",
  AED: "en-AE",
  GBP: "en-GB",
};

export const formatMoney = (
  money: Money | null,
  opts?: { compact?: boolean },
): string => {
  if (!money) return "Free";
  const major = money.amount / 100;
  if (major === 0) return "Free";
  return new Intl.NumberFormat(CURRENCY_LOCALE[money.currency], {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
    notation: opts?.compact && major >= 10000 ? "compact" : "standard",
  }).format(major);
};

export const formatNumber = (
  value: number,
  opts?: Intl.NumberFormatOptions,
): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, ...opts }).format(
    value,
  );

export const formatPercent = (value: number, fractionDigits = 0): string =>
  `${value.toFixed(fractionDigits)}%`;

export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

export const formatDuration = (minutes: number): string => {
  if (minutes < 1) return "now";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

export const formatClock = (value: string): string => {
  const [h, m] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

// `at` defaults to now, so every call site is untouched; tests pass a fixed
// clock to make these deterministic (the pattern from `lib/hours.ts`).
export const minutesSince = (iso: string, at: Date = new Date()): number =>
  Math.max(0, (at.getTime() - new Date(iso).getTime()) / 60_000);

export const formatRelativeTime = (iso: string, at: Date = new Date()): string => {
  const minutes = minutesSince(iso, at);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export const formatCountdown = (iso: string, at: Date = new Date()): string => {
  const ms = new Date(iso).getTime() - at.getTime();
  if (ms <= 0) return "expired";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.round(minutes / 60)}h left`;
};

/**
 * Freshness is derived in one place because both apps must agree on it: the
 * consumer sees "live 4 min ago", the venue sees "you are about to drop out of
 * recommendations". Two definitions would be a support nightmare.
 */
export const getFreshness = (iso: string, at: Date = new Date()): Freshness => {
  const ageMinutes = minutesSince(iso, at);
  const { live, recent, stale } = APP.freshnessThresholds;
  if (ageMinutes <= live) return { level: "live", ageMinutes, label: "Live" };
  if (ageMinutes <= recent) {
    return {
      level: "recent",
      ageMinutes,
      label: `${Math.round(ageMinutes)} min ago`,
    };
  }
  if (ageMinutes <= stale) {
    return {
      level: "stale",
      ageMinutes,
      label: `${Math.round(ageMinutes)} min ago`,
    };
  }
  return { level: "expired", ageMinutes, label: "Needs update" };
};

export const priceBandLabel = (band: 1 | 2 | 3 | 4): string => "₹".repeat(band);

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
