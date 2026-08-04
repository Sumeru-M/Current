import type { ServiceContainer } from "./contracts";
import { MockIntentService } from "./mock/intent-engine";
import { createTranscriptionService } from "./speech";
import {
  MockAnalyticsService,
  MockAvailabilityService,
  MockBookingService,
  MockBusinessService,
  MockRecommendationService,
  MockInstantService,
  MockVenueService,
} from "./mock/services";

/**
 * Service container.
 *
 * The single seam between the UI and the outside world. Today it returns mock
 * implementations; when the backend exists, this file gains an `http/` sibling
 * and the factory switches on an env flag:
 *
 *   return process.env.NEXT_PUBLIC_API_MODE === "http"
 *     ? createHttpServices(config)
 *     : createMockServices();
 *
 * No component, hook or page imports a concrete implementation, so that change
 * is genuinely one file. This is also what makes the app testable: a test
 * swaps the container for stubs without a network mock library.
 */
const createMockServices = (): ServiceContainer => ({
  intent: new MockIntentService(),
  recommendations: new MockRecommendationService(),
  venues: new MockVenueService(),
  availability: new MockAvailabilityService(),
  instants: new MockInstantService(),
  analytics: new MockAnalyticsService(),
  business: new MockBusinessService(),
  bookings: new MockBookingService(),
  /** Real, not mocked — the browser engine is the production engine for now. */
  speech: createTranscriptionService(),
});

let container: ServiceContainer | null = null;

export const services = (): ServiceContainer => {
  container ??= createMockServices();
  return container;
};

/** Test/Storybook seam. */
export const __setServices = (next: ServiceContainer): void => {
  container = next;
};

export type { ServiceContainer } from "./contracts";
