import { ConsumerShell } from "@/components/layout/consumer-shell";

/**
 * The consumer app and the business portal are separate route groups with
 * separate shells. They share the design system and the service layer, but not
 * navigation, density or information architecture — because they are used by
 * different people, in different postures, with different goals. Forcing them
 * into one layout is how portals end up feeling like an afterthought.
 */
export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsumerShell>{children}</ConsumerShell>;
}
