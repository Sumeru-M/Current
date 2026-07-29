"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { CONSUMER_NAV, isActive } from "@/config/navigation";
import { APP } from "@/config/app";

/**
 * Consumer shell.
 *
 * Mobile is the primary target — this product is used standing outside a bar at
 * 11pm — so navigation is a thumb-reachable bottom bar, and it promotes to a
 * rail on tablet/desktop rather than being duplicated. One component, two
 * layouts, no `isMobile` branch in feature code.
 */
export function ConsumerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-line px-4 py-6 lg:flex">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-2 px-2">
            <Wordmark />
          </Link>
          <nav aria-label="Primary" className="space-y-0.5">
            {CONSUMER_NAV.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-colors",
                    active
                      ? "text-ink"
                      : "text-muted hover:text-ink hover:bg-raised",
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
        </div>

        <Link
          href="/business"
          className="group flex items-center justify-between rounded-[12px] border border-line bg-surface px-3 py-2.5 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <span>
            <span className="block font-medium text-ink">For venues</span>
            Business portal
          </span>
          <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {CONSUMER_NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-ink" : "text-subtle",
                  )}
                >
                  <span className="relative">
                    <item.icon className="size-[18px]" aria-hidden />
                    {active ? (
                      <span className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid size-7 place-items-center rounded-[9px] bg-accent text-[13px] font-semibold text-on-accent">
        A
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
        {APP.name}
      </span>
    </span>
  );
}
