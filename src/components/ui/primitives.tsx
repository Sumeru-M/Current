import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Surface                                                                     */
/* -------------------------------------------------------------------------- */

export const cardStyles = cva(
  "rounded-[var(--radius-card)] transition-colors",
  {
    variants: {
      tone: {
        default: "bg-surface border border-line",
        raised: "bg-raised border border-line",
        ghost: "bg-transparent border border-line",
        accent: "bg-accent-wash border border-accent/25",
      },
      interactive: {
        true: "hover:border-line-strong focus-within:border-line-strong cursor-pointer",
        false: "",
      },
      pad: { none: "", sm: "p-3", md: "p-4", lg: "p-6" },
    },
    defaultVariants: { tone: "default", interactive: false, pad: "md" },
  },
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardStyles> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, tone, interactive, pad, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardStyles({ tone, interactive, pad }), className)}
      {...props}
    />
  );
});

/* -------------------------------------------------------------------------- */
/* Badge / Chip                                                                */
/* -------------------------------------------------------------------------- */

export const badgeStyles = cva(
  "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-raised text-muted border border-line",
        accent: "bg-accent-wash text-accent border border-accent/25",
        positive: "bg-positive-wash text-positive border border-positive/25",
        caution: "bg-caution-wash text-caution border border-caution/25",
        critical: "bg-critical-wash text-critical border border-critical/25",
        outline: "border border-line-strong text-muted",
      },
      size: {
        sm: "h-[22px] rounded-full px-2 text-[11px]",
        md: "h-7 rounded-full px-2.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeStyles({ tone, size }), className)} {...props} />
  );
}

/* -------------------------------------------------------------------------- */
/* Typography helpers                                                          */
/* -------------------------------------------------------------------------- */

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.14em] text-subtle",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-[10px] bg-raised animate-shimmer",
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* State surfaces — designed once, reused everywhere                           */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="text-subtle">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. It's us, not you.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-critical/25 bg-critical-wash/40 px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">
        {description}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-[13px] font-medium text-accent hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Meter — one bar primitive for capacity, share, progress                     */
/* -------------------------------------------------------------------------- */

export function Meter({
  value,
  tone = "accent",
  className,
  label,
}: {
  /** 0–1 */
  value: number;
  tone?: "accent" | "positive" | "caution" | "critical" | "neutral";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const toneClass = {
    accent: "bg-accent",
    positive: "bg-positive",
    caution: "bg-caution",
    critical: "bg-critical",
    neutral: "bg-line-strong",
  }[tone];

  return (
    <div
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-line",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          toneClass,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
