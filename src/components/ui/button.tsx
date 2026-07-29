"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The button is where a design system either holds or leaks. Every state —
 * hover, active, focus-visible, disabled, loading — is defined once here.
 * `asChild`-style polymorphism is deliberately omitted: it invites invalid HTML
 * (buttons inside anchors). Where a link needs to look like a button, compose
 * `buttonStyles()` onto a `<Link>` instead.
 */
export const buttonStyles = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,border-color,color,transform,opacity] duration-150",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-hover",
        secondary:
          "bg-raised text-ink border border-line hover:border-line-strong hover:bg-overlay",
        ghost: "text-muted hover:text-ink hover:bg-raised",
        outline: "border border-line-strong text-ink hover:bg-raised",
        danger:
          "bg-critical-wash text-critical border border-critical/30 hover:bg-critical/15",
        subtle: "bg-accent-wash text-accent hover:bg-accent/15",
      },
      size: {
        sm: "h-8 rounded-[8px] px-3 text-[13px]",
        md: "h-10 rounded-[10px] px-4 text-sm",
        lg: "h-12 rounded-[12px] px-6 text-[15px]",
        icon: "h-10 w-10 rounded-[10px]",
        "icon-sm": "h-8 w-8 rounded-[8px]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "secondary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      block,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(buttonStyles({ variant, size, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
