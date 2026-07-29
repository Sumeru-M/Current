import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bookmark,
  Building2,
  CalendarCheck,
  Clapperboard,
  Radio,
  Settings,
  Sparkles,
  Ticket,
  User,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roadmap surfaces render but announce themselves as upcoming. */
  upcoming?: boolean;
  /** Exact match only — otherwise "/" would match every route. */
  exact?: boolean;
}

export const CONSUMER_NAV: NavItem[] = [
  { href: "/", label: "Discover", icon: Sparkles, exact: true },
  { href: "/recommendations", label: "Results", icon: Ticket },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/profile", label: "You", icon: User },
];

export const BUSINESS_NAV: NavItem[] = [
  { href: "/business", label: "Overview", icon: BarChart3, exact: true },
  { href: "/business/live", label: "Live operations", icon: Radio },
  { href: "/business/instants", label: "Instants", icon: Clapperboard },
  { href: "/business/analytics", label: "Analytics", icon: Building2 },
  { href: "/business/profile", label: "Venue profile", icon: Settings },
];

export const isActive = (pathname: string, item: NavItem): boolean =>
  item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
