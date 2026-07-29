import type { Metadata } from "next";
import { LiveConsole } from "@/features/business/live-console";

export const metadata: Metadata = { title: "Live operations" };

export default function BusinessLivePage() {
  return <LiveConsole />;
}
