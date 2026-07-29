import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** One header rhythm across both apps: title, optional subtitle, right slot. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 py-6 sm:py-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
          {title}
        </h1>
        {subtitle ? <p className="text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
