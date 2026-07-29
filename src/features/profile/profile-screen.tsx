"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card, SectionLabel } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSavedStore } from "@/stores/saved";
import { useIntentSession } from "@/stores/intent-session";
import { liveVerticals, plannedVerticals } from "@/config/verticals";
import { APP } from "@/config/app";

/**
 * Profile / settings.
 *
 * Preferences here are the seed of a *persistent* intent layer: today they are
 * local toggles, but each maps 1:1 to a field the engine already understands
 * (`maxTravelMinutes`, motion preference, defaults). When accounts land, this
 * screen writes to a profile service and the ranker reads a default intent —
 * no new concepts required.
 */
export function ProfileScreen() {
  const savedCount = useSavedStore((s) => s.items.length);
  const history = useIntentSession((s) => s.history);
  const reset = useIntentSession((s) => s.reset);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [liveOnly, setLiveOnly] = useState(true);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
      <PageHeader
        title="You"
        subtitle="Guest session — no account needed for the pilot"
      />

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Saved" value={savedCount} />
          <Stat label="Searches" value={history.length} />
          <Stat label="Bookings" value={0} />
        </div>

        <section className="space-y-3">
          <SectionLabel>Defaults</SectionLabel>
          <Card className="space-y-4">
            <Switch
              checked={nearbyOnly}
              onCheckedChange={setNearbyOnly}
              label="Prefer nearby"
              description="Weight distance more heavily when ranking."
            />
            <Switch
              checked={liveOnly}
              onCheckedChange={setLiveOnly}
              label="Only venues with live data"
              description="Hide places that haven't updated in the last hour."
            />
            <Switch
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
              label="Reduce motion"
              description="Your system setting is respected automatically. This forces it on."
            />
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Coming to {APP.name}</SectionLabel>
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {liveVerticals().map((vertical) => (
                <Badge key={vertical.id} tone="positive" size="md">
                  {vertical.nounPlural}
                </Badge>
              ))}
              {plannedVerticals().map((vertical) => (
                <Badge key={vertical.id} tone="outline" size="md">
                  {vertical.nounPlural}
                </Badge>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              The engine is vertical-agnostic. Each of these plugs into the same
              intent, availability and ranking model — no separate app.
            </p>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionLabel>Session</SectionLabel>
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink">Clear this session</p>
              <p className="text-[12px] text-muted">
                Drops your search history and current results.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                reset();
                toast.info("Session cleared");
              }}
            >
              Clear
            </Button>
          </Card>
        </section>

        <Link
          href="/business"
          className="group flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[12px] bg-accent-wash text-accent">
              <Building2 className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[14px] font-medium text-ink">Run a venue?</p>
              <p className="text-[12px] text-muted">Open the business portal</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card pad="sm" className="text-center">
      <p className="text-[22px] font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">
        {label}
      </p>
    </Card>
  );
}
