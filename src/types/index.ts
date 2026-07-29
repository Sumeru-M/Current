export * from "./analytics";
export * from "./intent";
export * from "./live";
export * from "./recommendation";
export * from "./vertical";
export * from "./venue";

export interface Booking {
  id: string;
  venueId: string;
  offerId: string | null;
  guests: number;
  scheduledFor: string;
  status: "held" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  reference: string;
}

export interface SavedVenue {
  venueId: string;
  savedAt: string;
  /** The intent that surfaced it — context is what makes a save useful later. */
  contextLabel: string | null;
}

/** Envelope for every service call. Errors are values, not exceptions. */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}
