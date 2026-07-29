"use client";

import { useRef, useState } from "react";
import { Clapperboard, Eye, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/page-header";
import { Card, EmptyState, SectionLabel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { MediaSurface } from "@/components/domain/media-surface";
import { formatCountdown, formatRelativeTime } from "@/lib/format";
import { APP } from "@/config/app";
import {
  useCreateInstant,
  useInstants,
  useRemoveInstant,
} from "@/hooks/use-domain-queries";
import { useBusinessContext } from "./business-context";
import { InstantViewer } from "@/features/venue/instant-viewer";
import type { Instant, InstantMedia } from "@/types";

/**
 * Instant composer + manager.
 *
 * Upload is real: the selected photo or clip is held as an object URL, previews
 * in the exact viewer guests use, and plays back. What it is not is *durable* —
 * there is no storage layer yet, so an instant does not survive a hard refresh,
 * and the UI says so rather than pretending.
 *
 * Clips are validated against the 10-second cap by reading the decoded
 * metadata, not by trusting a file name. That check belongs on the server too
 * when one exists; doing it here as well is what stops a manager wasting a
 * 40MB upload on a clip we would reject anyway.
 *
 * When storage lands, `handleFile` swaps an object URL for a signed-upload URL
 * and everything else — expiry, viewer, list, analytics — is untouched.
 */

const MAX_CLIP_SECONDS = 10;
const MIN_CLIP_SECONDS = 1;
const MAX_FILE_BYTES = 60 * 1024 * 1024;

/** Fallback artwork for instants posted without a file. */
const PALETTES: {
  id: string;
  label: string;
  gradient: [string, string];
  accent: string;
}[] = [
  {
    id: "crimson",
    label: "Crimson",
    gradient: ["#2a0d12", "#0b0b0f"],
    accent: "#ff4d5e",
  },
  {
    id: "violet",
    label: "Violet",
    gradient: ["#150b2b", "#08080a"],
    accent: "#7c5cff",
  },
  {
    id: "emerald",
    label: "Emerald",
    gradient: ["#0c1f1a", "#08080a"],
    accent: "#3ddc97",
  },
  {
    id: "amber",
    label: "Amber",
    gradient: ["#231404", "#0a0a0c"],
    accent: "#f5a524",
  },
  {
    id: "azure",
    label: "Azure",
    gradient: ["#0d1c2b", "#08080a"],
    accent: "#4da3ff",
  },
  {
    id: "magenta",
    label: "Magenta",
    gradient: ["#2b0f24", "#0a0a0c"],
    accent: "#ff5cc8",
  },
];

const DURATIONS = [
  { value: "60", label: "1 hour" },
  { value: "180", label: "3 hours" },
  { value: "360", label: "6 hours" },
  { value: "720", label: "12 hours" },
];

interface Upload {
  url: string;
  kind: "image" | "video";
  durationSeconds?: number;
  fileName: string;
}

/** Reads real duration from decoded metadata — never from the file name. */
const readVideoDuration = (url: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => resolve(probe.duration);
    probe.onerror = () => reject(new Error("Could not read that video"));
    probe.src = url;
  });

export function InstantComposer() {
  const { activeVenueId, activeVenue } = useBusinessContext();
  const { data: instants = [] } = useInstants(activeVenueId);
  const createInstant = useCreateInstant(activeVenueId ?? "");
  const removeInstant = useRemoveInstant(activeVenueId ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [upload, setUpload] = useState<Upload | null>(null);
  const [palette, setPalette] = useState(PALETTES[0]);
  const [caption, setCaption] = useState("");
  const [expiry, setExpiry] = useState("180");
  const [preview, setPreview] = useState<Instant | null>(null);
  const [checking, setChecking] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error(
        "File too large",
        "Keep it under 60MB — shoot it on the phone, don't export it.",
      );
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Unsupported file", "Photos and short clips only.");
      return;
    }

    const url = URL.createObjectURL(file);

    if (!isVideo) {
      setUpload({ url, kind: "image", fileName: file.name });
      return;
    }

    setChecking(true);
    try {
      const duration = await readVideoDuration(url);
      if (duration > MAX_CLIP_SECONDS + 0.5) {
        URL.revokeObjectURL(url);
        toast.error(
          "Clip is too long",
          `${Math.round(duration)}s — instants are ${MAX_CLIP_SECONDS} seconds max. Trim it and try again.`,
        );
        return;
      }
      if (duration < MIN_CLIP_SECONDS) {
        URL.revokeObjectURL(url);
        toast.error("Clip is too short", "Give it at least a second.");
        return;
      }
      setUpload({
        url,
        kind: "video",
        durationSeconds: Math.round(duration * 10) / 10,
        fileName: file.name,
      });
    } catch {
      URL.revokeObjectURL(url);
      toast.error(
        "Couldn't read that video",
        "Try an MP4 straight from the camera roll.",
      );
    } finally {
      setChecking(false);
    }
  };

  const clearUpload = () => {
    if (upload) URL.revokeObjectURL(upload.url);
    setUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildMedia = (): InstantMedia => ({
    kind: upload?.kind ?? "image",
    url: upload?.url,
    gradient: palette.gradient,
    accent: palette.accent,
    durationSeconds: upload?.durationSeconds,
  });

  const openPreview = () => {
    if (!caption.trim() && !upload) return;
    const now = Date.now();
    setPreview({
      id: "preview",
      venueId: activeVenueId ?? "",
      media: buildMedia(),
      caption: caption.trim() || "Your caption appears here",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + Number(expiry) * 60_000).toISOString(),
      viewCount: 0,
    });
  };

  const publish = async () => {
    if (!activeVenueId || (!caption.trim() && !upload)) return;
    await createInstant.mutateAsync({
      venueId: activeVenueId,
      media: buildMedia(),
      caption: caption.trim(),
      expiresAt: new Date(Date.now() + Number(expiry) * 60_000).toISOString(),
    });
    setCaption("");
    setUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success(
      "Instant is live",
      "Groups seeing you in their recommendations can watch it now.",
    );
  };

  const canPost = Boolean(caption.trim() || upload);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
      <PageHeader
        eyebrow={activeVenue?.name}
        title="Instants"
        subtitle="A photo or a 10-second clip from inside the room, right now"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3">
          <SectionLabel>New instant</SectionLabel>
          <Card pad="lg" className="space-y-5">
            {/* Upload */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                id="instant-file"
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />

              {upload ? (
                <div className="relative overflow-hidden rounded-[14px] border border-line">
                  {upload.kind === "video" ? (
                    <video
                      src={upload.url}
                      className="h-56 w-full bg-black object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={upload.url}
                      alt="Selected instant"
                      className="h-56 w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearUpload}
                    aria-label="Remove selected file"
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                  <p className="absolute bottom-2 left-3 text-[11px] text-white/80">
                    {upload.kind === "video"
                      ? `Clip · ${upload.durationSeconds}s`
                      : "Photo"}
                  </p>
                </div>
              ) : (
                <label
                  htmlFor="instant-file"
                  className={cn(
                    "flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong bg-raised text-center transition-colors hover:border-accent hover:bg-accent-wash/40",
                    checking && "pointer-events-none opacity-60",
                  )}
                >
                  <Upload className="size-5 text-subtle" aria-hidden />
                  <span className="text-[13px] font-medium text-ink">
                    {checking ? "Checking clip…" : "Add a photo or clip"}
                  </span>
                  <span className="text-[12px] text-muted">
                    Up to {MAX_CLIP_SECONDS} seconds · shoot it on the phone
                  </span>
                </label>
              )}
            </div>

            {/* Fallback artwork, only relevant with no file */}
            {!upload ? (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink">
                  Or post text on a backdrop
                </p>
                <ul className="flex flex-wrap gap-2">
                  {PALETTES.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => setPalette(option)}
                        aria-pressed={palette.id === option.id}
                        aria-label={option.label}
                        className={cn(
                          "size-11 overflow-hidden rounded-[10px] border-2 transition-colors",
                          palette.id === option.id
                            ? "border-accent"
                            : "border-line",
                        )}
                      >
                        <MediaSurface
                          gradient={option.gradient}
                          accent={option.accent}
                          alt=""
                          className="h-full w-full"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Field
              label="Caption"
              hint="Say what's happening right now. Specific beats promotional."
            >
              {({ id }) => (
                <Textarea
                  id={id}
                  value={caption}
                  maxLength={140}
                  placeholder="Kohra just went b2b. Room is full, queue is 10 minutes."
                  onChange={(event) => setCaption(event.target.value)}
                />
              )}
            </Field>

            <Field label="Expires after">
              {({ id }) => (
                <Select
                  id={id}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                >
                  {DURATIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] tabular-nums text-subtle">
                {caption.length}/140
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openPreview}
                  disabled={!canPost}
                >
                  <Eye className="size-4" aria-hidden />
                  Preview
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void publish()}
                  loading={createInstant.isPending}
                  disabled={!canPost}
                >
                  Post instant
                </Button>
              </div>
            </div>

            <p className="flex items-start gap-1.5 border-t border-line pt-3 text-[11px] leading-relaxed text-subtle">
              <ImagePlus className="mt-0.5 size-3 shrink-0" aria-hidden />
              Uploads play for real in this build but live in the browser only —
              they don&apos;t survive a refresh until the storage layer ships.
            </p>
          </Card>
        </section>

        {/* Active instants */}
        <section className="space-y-3">
          <SectionLabel>Live now</SectionLabel>
          {instants.length ? (
            <ul className="space-y-2">
              {instants.map((instant) => (
                <li key={instant.id}>
                  <Card className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPreview(instant)}
                      className="block w-full overflow-hidden rounded-[12px]"
                      aria-label={`Play instant: ${instant.caption}`}
                    >
                      {instant.media.kind === "video" && instant.media.url ? (
                        <video
                          src={instant.media.url}
                          className="h-28 w-full bg-black object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <MediaSurface
                          gradient={instant.media.gradient}
                          accent={instant.media.accent}
                          url={instant.media.url}
                          alt={instant.caption}
                          className="h-28 w-full"
                        />
                      )}
                    </button>
                    <p className="text-[13px] leading-relaxed text-ink">
                      {instant.caption}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-subtle">
                        {instant.viewCount.toLocaleString("en-IN")} views ·{" "}
                        {formatRelativeTime(instant.createdAt)}
                      </span>
                      <span className="text-[11px] text-caution">
                        {formatCountdown(instant.expiresAt)}
                      </span>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      block
                      onClick={() => {
                        removeInstant.mutate(instant.id);
                        toast.info("Instant removed");
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Remove
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Clapperboard className="size-5" />}
              title="Nothing live"
              description={`Instants expire on their own, so there's nothing to clean up later. Default is ${APP.instantDurationMs / 1000}s per photo when guests watch.`}
            />
          )}
        </section>
      </div>

      {/* Preview uses the exact guest viewer — what you see is what they see. */}
      <InstantViewer
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        venueName={activeVenue?.name ?? "Your venue"}
        instants={preview ? [preview] : []}
      />
    </div>
  );
}
