import { describe, expect, it } from "vitest";
import { isOpenNow, nextOpening, opensLaterToday } from "./hours";
import { makeVenue, allWeek, openOnDays } from "@/mocks/factories";

// Dates are built with local-time components so getDay/getHours read the same
// way regardless of the runner's timezone (CI is UTC, dev is IST).
const MON_1PM = new Date(2026, 0, 5, 13, 0); // Monday
const SAT_2AM = new Date(2026, 0, 3, 2, 0); // Saturday, small hours
const FRI_10PM = new Date(2026, 0, 2, 22, 0); // Friday night

describe("isOpenNow", () => {
  /**
   * Bug 5. At midday every club is closed; the app must know that rather than
   * render live telemetry for a room that opens in six hours.
   */
  it("is closed at midday for a nights-only venue", () => {
    const club = makeVenue({ openingHours: allWeek("21:00", "01:00") });
    expect(isOpenNow(club, MON_1PM)).toBe(false);
  });

  it("is open during its evening window", () => {
    const club = makeVenue({ openingHours: allWeek("21:00", "01:00") });
    expect(isOpenNow(club, FRI_10PM)).toBe(true);
  });

  /**
   * The case naive implementations always get wrong: a Friday window that runs
   * to 4am is still open at 2am on Saturday. The window belongs to Friday.
   */
  it("stays open past midnight on the prior day's window", () => {
    const lateRoom = makeVenue({
      openingHours: openOnDays([5], "21:00", "04:00"), // Friday only
    });
    expect(isOpenNow(lateRoom, SAT_2AM)).toBe(true);
  });

  it("is closed on a day it does not trade", () => {
    const fridaysOnly = makeVenue({
      openingHours: openOnDays([5], "21:00", "04:00"),
    });
    expect(isOpenNow(fridaysOnly, MON_1PM)).toBe(false);
  });
});

describe("nextOpening", () => {
  it("offers a usable 'later today' for a nights-only venue at midday", () => {
    const club = makeVenue({ openingHours: allWeek("21:00", "01:00") });
    const next = nextOpening(club, MON_1PM);
    expect(next?.inDays).toBe(0);
    expect(next?.label).toBe("Opens 9pm");
  });

  it("names the day for a venue that opens later in the week", () => {
    const fridaysOnly = makeVenue({
      openingHours: openOnDays([5], "22:00", "04:00"),
    });
    const next = nextOpening(fridaysOnly, MON_1PM);
    expect(next?.label).toBe("Opens Friday 10pm");
  });

  it("does not offer 'later today' once the venue has already opened", () => {
    const club = makeVenue({ openingHours: allWeek("21:00", "01:00") });
    expect(opensLaterToday(club, FRI_10PM)).toBe(false);
  });

  it("returns null when the venue never opens", () => {
    const closed = makeVenue({ openingHours: [] });
    expect(nextOpening(closed, MON_1PM)).toBeNull();
  });
});
