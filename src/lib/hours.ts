import type { OpeningWindow, Venue } from "@/types";

/**
 * Opening-hours logic, in one place.
 *
 * Shared by the mock store (which decides whether a venue is trading) and the
 * UI (which tells a user when it opens). Two implementations of "is it open?"
 * would eventually disagree, and a product whose card says "closed" while its
 * detail page says "open until 4" has no credibility left to spend.
 *
 * The case that matters in nightlife, and that naive implementations always get
 * wrong: a window closing after midnight belongs to the *previous* day. A room
 * open 21:00–04:00 on Friday is still open at 2am on Saturday morning.
 */

const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const crossesMidnight = (window: OpeningWindow): boolean =>
  toMinutes(window.closesAt) <= toMinutes(window.opensAt);

export const isOpenNow = (venue: Venue, at: Date = new Date()): boolean => {
  const minutes = at.getHours() * 60 + at.getMinutes();

  const today = venue.openingHours.find((w) => w.day === at.getDay());
  if (today && !today.closed) {
    const opens = toMinutes(today.opensAt);
    if (minutes >= opens && (crossesMidnight(today) || minutes < toMinutes(today.closesAt))) {
      return true;
    }
  }

  // Yesterday's late window spilling into the small hours of today.
  const yesterday = venue.openingHours.find((w) => w.day === (at.getDay() + 6) % 7);
  if (yesterday && !yesterday.closed && crossesMidnight(yesterday)) {
    if (minutes < toMinutes(yesterday.closesAt)) return true;
  }

  return false;
};

export interface NextOpening {
  /** Days ahead: 0 = later today, 1 = tomorrow, … */
  inDays: number;
  opensAt: string;
  /** "Opens 9pm", "Opens tomorrow 9pm", "Opens Friday 10pm". */
  label: string;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const clockLabel = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 || h === 24 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, "0")}${suffix}`;
};

/**
 * When does this venue next open? Looks a week ahead so a Fridays-only room
 * still answers usefully on a Monday afternoon.
 */
export const nextOpening = (venue: Venue, at: Date = new Date()): NextOpening | null => {
  const minutes = at.getHours() * 60 + at.getMinutes();

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (at.getDay() + offset) % 7;
    const window = venue.openingHours.find((w) => w.day === day);
    if (!window || window.closed) continue;

    // Today only counts if it hasn't already opened.
    if (offset === 0 && minutes >= toMinutes(window.opensAt)) continue;

    const label =
      offset === 0
        ? `Opens ${clockLabel(window.opensAt)}`
        : offset === 1
          ? `Opens tomorrow ${clockLabel(window.opensAt)}`
          : `Opens ${DAY_NAMES[day]} ${clockLabel(window.opensAt)}`;

    return { inDays: offset, opensAt: window.opensAt, label };
  }

  return null;
};

/** True when the venue opens later in this same night-out window (today). */
export const opensLaterToday = (venue: Venue, at: Date = new Date()): boolean =>
  nextOpening(venue, at)?.inDays === 0;
