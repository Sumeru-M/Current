import type { Metadata } from "next";
import { RecommendationsScreen } from "@/features/recommendations/recommendations-screen";

export const metadata: Metadata = { title: "Results" };

export default function RecommendationsPage() {
  return <RecommendationsScreen />;
}
