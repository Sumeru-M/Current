"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { BUSINESS_NAV, isActive } from "@/config/navigation";
import { Wordmark } from "./consumer-shell";
import { useBusinessContext } from "@/features/business/business-context";
import { useAvailability } from "@/hooks/use-domain-queries";
import { FreshnessChip } from "@/components/domain/live-indicators";

/**
 * Business shell.
 *
 * Denser than the consumer app by design — this is a tool used repeatedly by
 * the same people, so it optimises for scanning and muscle memory rather than
 * for delight on first contact. Persistent sidebar on desktop, drawer on
 * mobile (a door manager updating the queue on a phone is a first-class use
 * case, not a responsive afterthought).
 *
 * The venue switcher lives in the sidebar because a hospitality group with
 * five rooms is the eventual customer, not the exception.
 */
export function BusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { venues, activeVenueId, setActiveVenueId, activeVenue } =
    useBusinessContext();
  const { data: availability } = useAvailability(activeVenueId);

  const nav = (
    <nav aria-label="Business sections" className="space-y-0.5">
      {BUSINESS_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawerOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-colors",
              active ? "text-ink" : "text-muted hover:bg-raised hover:text-ink",
            )}
          >
            {active ? (
              <span className="absolute inset-0 -z-10 rounded-[10px] bg-raised" />
            ) : null}
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const venueSwitcher = (
    <div className="space-y-1.5">
      <label
        htmlFor="venue-switcher"
        className="px-1 text-[11px] uppercase tracking-[0.14em] text-subtle"
      >
        Venue
      </label>
      <div className="relative">
        <select
          id="venue-switcher"
          value={activeVenueId ?? ""}
          onChange={(event) => setActiveVenueId(event.target.value)}
          className="w-full appearance-none rounded-[10px] border border-line bg-surface px-3 py-2 pr-8 text-[13px] text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-line px-4 py-6 lg:flex">
        <div className="space-y-7">
          <div className="flex items-center justify-between px-1">
            <Wordmark />
            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-subtle">
              Business
            </span>
          </div>
          {venueSwitcher}
          {nav}
        </div>

        <div className="space-y-3">
          {availability ? (
            <div className="rounded-[12px] border border-line bg-surface px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">
                Live status
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[13px] text-ink">
                  {availability.occupancyPct}% full
                </span>
                <FreshnessChip updatedAt={availability.updatedAt} />
              </div>
            </div>
          ) : null}
          <Link
            href="/"
            className="flex items-center gap-2 px-1 text-[12px] text-subtle transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Consumer app
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-[10px] border border-line text-muted"
          >
            <Menu className="size-4" aria-hidden />
          </button>
          <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
            {activeVenue?.name ?? "Business"}
          </p>
          {availability ? (
            <FreshnessChip updatedAt={availability.updatedAt} />
          ) : null}
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 animate-enter-fade bg-black/70"
          />
          <aside
            aria-label="Business navigation"
            className="relative flex h-full w-72 animate-enter-drawer flex-col gap-6 border-r border-line bg-surface px-4 py-6"
          >
            <div className="flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid size-8 place-items-center rounded-[8px] text-muted hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {venueSwitcher}
            {nav}
            <Link
              href="/"
              className="mt-auto flex items-center gap-2 text-[12px] text-subtle hover:text-ink"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Consumer app
            </Link>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
