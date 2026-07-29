import type { Metadata } from "next";
import { BookingsScreen } from "@/features/bookings/bookings-screen";

export const metadata: Metadata = { title: "Bookings" };

export default function BookingsPage() {
  return <BookingsScreen />;
}
