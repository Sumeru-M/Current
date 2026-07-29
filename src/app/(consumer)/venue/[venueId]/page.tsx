import { VenueScreen } from "@/features/venue/venue-screen";

/**
 * Next 16: route params are async. Awaiting here (rather than in a client
 * component via `use()`) keeps the client bundle free of the params promise
 * and gives us a natural place to hang `generateMetadata` when the venue
 * service moves server-side.
 */
export default async function VenuePage({
  params,
}: PageProps<"/venue/[venueId]">) {
  const { venueId } = await params;
  return <VenueScreen venueId={venueId} />;
}
