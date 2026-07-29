import type { VerticalDescriptor, VerticalId } from "@/types/vertical";

/**
 * Vertical registry.
 *
 * Adding a vertical is: one entry here + fixtures in `src/mocks`. No component,
 * route or service signature changes. `status: "planned"` entries are rendered
 * in the UI as roadmap surfaces — useful in an investor or partner demo, and it
 * forces us to keep the vertical-agnostic code path honest from day one.
 */
export const VERTICALS: Record<VerticalId, VerticalDescriptor> = {
  club: {
    id: "club",
    noun: "club",
    nounPlural: "clubs",
    bookingNoun: "table",
    supportsLiveOccupancy: true,
    supportsQueue: true,
    supportsStories: true,
    status: "live",
    attributes: [
      { key: "music_genre", label: "Music", kind: "tag", surfaceOnCard: true },
      { key: "crowd", label: "Crowd", kind: "tag" },
      { key: "resident_dj", label: "Resident DJ", kind: "text" },
      { key: "sound_system", label: "Sound", kind: "text" },
      { key: "smoking_area", label: "Smoking area", kind: "text" },
    ],
    samplePrompts: [
      "Six of us, techno, under ₹3,000 each",
      "Somewhere loud but no queue",
      "Rooftop, chilled, close to Indiranagar",
    ],
  },
  restaurant: {
    id: "restaurant",
    noun: "restaurant",
    nounPlural: "restaurants",
    bookingNoun: "table",
    supportsLiveOccupancy: true,
    supportsQueue: true,
    supportsStories: true,
    status: "planned",
    attributes: [
      { key: "cuisine", label: "Cuisine", kind: "tag", surfaceOnCard: true },
      { key: "seating", label: "Seating", kind: "tag" },
      { key: "chef", label: "Chef", kind: "text" },
    ],
    samplePrompts: ["Dinner for four, no wait, under ₹1,500 a head"],
  },
  sports_venue: {
    id: "sports_venue",
    noun: "venue",
    nounPlural: "venues",
    bookingNoun: "court",
    supportsLiveOccupancy: true,
    supportsQueue: false,
    supportsStories: false,
    status: "planned",
    attributes: [
      { key: "sport", label: "Sport", kind: "tag", surfaceOnCard: true },
      { key: "surface", label: "Surface", kind: "text" },
    ],
    samplePrompts: ["Turf for 10 at 7pm tonight"],
  },
  comedy_club: {
    id: "comedy_club",
    noun: "comedy club",
    nounPlural: "comedy clubs",
    bookingNoun: "seat",
    supportsLiveOccupancy: true,
    supportsQueue: true,
    supportsStories: true,
    status: "planned",
    attributes: [
      { key: "lineup", label: "Lineup", kind: "tag", surfaceOnCard: true },
    ],
    samplePrompts: ["Stand-up tonight, two seats, near MG Road"],
  },
  escape_room: {
    id: "escape_room",
    noun: "escape room",
    nounPlural: "escape rooms",
    bookingNoun: "slot",
    supportsLiveOccupancy: false,
    supportsQueue: false,
    supportsStories: false,
    status: "planned",
    attributes: [
      {
        key: "difficulty",
        label: "Difficulty",
        kind: "scalar",
        surfaceOnCard: true,
      },
      { key: "theme", label: "Theme", kind: "tag" },
    ],
    samplePrompts: ["Hard room for five, this evening"],
  },
  live_event: {
    id: "live_event",
    noun: "event",
    nounPlural: "events",
    bookingNoun: "ticket",
    supportsLiveOccupancy: false,
    supportsQueue: true,
    supportsStories: true,
    status: "planned",
    attributes: [
      { key: "genre", label: "Genre", kind: "tag", surfaceOnCard: true },
    ],
    samplePrompts: ["Something live tonight under ₹2,000"],
  },
  concert: {
    id: "concert",
    noun: "concert",
    nounPlural: "concerts",
    bookingNoun: "ticket",
    supportsLiveOccupancy: false,
    supportsQueue: true,
    supportsStories: true,
    status: "planned",
    attributes: [
      { key: "artist", label: "Artist", kind: "tag", surfaceOnCard: true },
    ],
    samplePrompts: ["Indie gig this weekend"],
  },
  experience: {
    id: "experience",
    noun: "experience",
    nounPlural: "experiences",
    bookingNoun: "slot",
    supportsLiveOccupancy: false,
    supportsQueue: false,
    supportsStories: true,
    status: "planned",
    attributes: [
      { key: "category", label: "Category", kind: "tag", surfaceOnCard: true },
    ],
    samplePrompts: ["Something we've never done before, Saturday"],
  },
  tourism: {
    id: "tourism",
    noun: "tour",
    nounPlural: "tours",
    bookingNoun: "slot",
    supportsLiveOccupancy: false,
    supportsQueue: true,
    supportsStories: true,
    status: "planned",
    attributes: [
      {
        key: "duration",
        label: "Duration",
        kind: "duration",
        surfaceOnCard: true,
      },
    ],
    samplePrompts: ["Half-day, walkable, not touristy"],
  },
  recreation: {
    id: "recreation",
    noun: "spot",
    nounPlural: "spots",
    bookingNoun: "slot",
    supportsLiveOccupancy: true,
    supportsQueue: false,
    supportsStories: false,
    status: "planned",
    attributes: [
      { key: "activity", label: "Activity", kind: "tag", surfaceOnCard: true },
    ],
    samplePrompts: ["Bowling for six after work"],
  },
  wellness: {
    id: "wellness",
    noun: "studio",
    nounPlural: "studios",
    bookingNoun: "session",
    supportsLiveOccupancy: true,
    supportsQueue: false,
    supportsStories: false,
    status: "planned",
    attributes: [
      { key: "modality", label: "Modality", kind: "tag", surfaceOnCard: true },
    ],
    samplePrompts: ["Recovery session tomorrow morning"],
  },
};

export const ACTIVE_VERTICAL: VerticalId = "club";

export const getVertical = (id: VerticalId | string): VerticalDescriptor =>
  VERTICALS[id as VerticalId] ?? VERTICALS[ACTIVE_VERTICAL];

export const liveVerticals = (): VerticalDescriptor[] =>
  Object.values(VERTICALS).filter((v) => v.status === "live");

export const plannedVerticals = (): VerticalDescriptor[] =>
  Object.values(VERTICALS).filter((v) => v.status === "planned");
