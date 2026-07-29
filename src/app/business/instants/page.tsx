import type { Metadata } from "next";
import { InstantComposer } from "@/features/business/instant-composer";

export const metadata: Metadata = { title: "Instants" };

export default function BusinessInstantsPage() {
  return <InstantComposer />;
}
