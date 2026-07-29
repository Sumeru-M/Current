import type { Metadata } from "next";
import { VenueProfileForm } from "@/features/business/venue-profile-form";

export const metadata: Metadata = { title: "Venue profile" };

export default function BusinessProfilePage() {
  return <VenueProfileForm />;
}
