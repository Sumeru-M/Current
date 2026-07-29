import { cn } from "@/lib/cn";

/**
 * MediaSurface
 *
 * Renders venue artwork. Today it composes deterministic gradient + grain from
 * the asset's palette; when `url` is present it renders the real asset. Because
 * every screen goes through this one component, switching the whole product
 * from generated artwork to a real CDN is a change in *this file only*.
 */
export function MediaSurface({
  gradient,
  accent,
  alt,
  className,
  intensity = "default",
  children,
  url,
}: {
  gradient: [string, string];
  accent: string;
  alt: string;
  className?: string;
  intensity?: "default" | "vivid" | "flat";
  children?: React.ReactNode;
  url?: string;
}) {
  const glow = intensity === "flat" ? 0 : intensity === "vivid" ? 0.55 : 0.32;

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative isolate overflow-hidden bg-raised", className)}
      style={{
        backgroundImage: url
          ? `url(${url})`
          : `radial-gradient(120% 80% at 15% 0%, ${hexA(accent, glow)}, transparent 60%),
             radial-gradient(90% 70% at 85% 100%, ${hexA(accent, glow * 0.5)}, transparent 55%),
             linear-gradient(155deg, ${gradient[0]}, ${gradient[1]})`,
        backgroundSize: url ? "cover" : undefined,
        backgroundPosition: url ? "center" : undefined,
      }}
    >
      {/* Film grain keeps large flat areas from banding on OLED phones. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      {children}
    </div>
  );
}

/** Hex → rgba without a colour library. */
function hexA(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
