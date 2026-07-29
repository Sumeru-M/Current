import type { Metadata } from "next";
import { SavedScreen } from "@/features/saved/saved-screen";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return <SavedScreen />;
}
