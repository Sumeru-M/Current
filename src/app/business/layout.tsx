import type { Metadata } from "next";
import { BusinessShell } from "@/components/layout/business-shell";
import { BusinessProvider } from "@/features/business/business-context";

export const metadata: Metadata = {
  title: { default: "Business portal", template: "%s · Business" },
};

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BusinessProvider>
      <BusinessShell>{children}</BusinessShell>
    </BusinessProvider>
  );
}
