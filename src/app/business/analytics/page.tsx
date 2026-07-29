import type { Metadata } from "next";
import { AnalyticsScreen } from "@/features/business/analytics-screen";

export const metadata: Metadata = { title: "Analytics" };

export default function BusinessAnalyticsPage() {
  return <AnalyticsScreen />;
}
