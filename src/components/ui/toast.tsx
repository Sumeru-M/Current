"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Toasts are a store, not a context, so any layer — a service-level mutation
 * callback, a keyboard shortcut handler — can raise one without being inside a
 * provider subtree. The viewport is `aria-live="polite"` so screen-reader users
 * get the same confirmation sighted users get.
 */

export type ToastTone = "success" | "info" | "error";

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString(36).slice(2) },
      ].slice(-3),
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "success" }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "info" }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, tone: "error" }),
};

const ICONS = {
  success: CheckCircle2,
  info: Info,
  error: TriangleAlert,
} as const;

const TONES = {
  success: "text-positive",
  info: "text-accent",
  error: "text-critical",
} as const;

function ToastRow({ toast: item }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[item.tone];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), 4200);
    return () => clearTimeout(timer);
  }, [item.id, dismiss]);

  return (
    <li className="pointer-events-auto animate-enter-sheet flex w-full items-start gap-3 rounded-[14px] border border-line bg-overlay/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur">
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", TONES[item.tone])}
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[13px] font-medium text-ink">{item.title}</p>
        {item.description ? (
          <p className="text-[12px] leading-relaxed text-muted">
            {item.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="ml-auto shrink-0 text-[11px] text-subtle hover:text-ink"
      >
        Dismiss
      </button>
    </li>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <ul
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex w-[min(26rem,calc(100%-2rem))] flex-col gap-2 sm:bottom-6"
    >
      {toasts.map((item) => (
        <ToastRow key={item.id} toast={item} />
      ))}
    </ul>
  );
}
