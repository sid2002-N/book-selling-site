"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "neutral" | "success" | "error";
type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
};

// Tiny module-level store: toasts are UI state, not app state (ARCHITECTURE §9).
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(input: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }): void {
  items = [...items, { ...input, id: nextId++, tone: input.tone ?? "neutral" }].slice(-4);
  emit();
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const empty: ToastItem[] = [];

const toneIcon: Record<ToastTone, ReactNode> = {
  neutral: <Info className="size-4 text-info" aria-hidden />,
  success: <CircleCheck className="size-4 text-success" aria-hidden />,
  error: <CircleAlert className="size-4 text-error" aria-hidden />,
};

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => empty);
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
      {list.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          onOpenChange={(open) => !open && dismiss(t.id)}
          className={cn(
            "glass flex w-full items-start gap-3 rounded-lg p-4 text-fg data-[state=open]:animate-rise-in",
            "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:animate-fade-in",
          )}
        >
          <span className="mt-0.5">{toneIcon[t.tone]}</span>
          <div className="flex flex-1 flex-col gap-0.5">
            <ToastPrimitive.Title className="text-body-sm font-medium">{t.title}</ToastPrimitive.Title>
            {t.description ? (
              <ToastPrimitive.Description className="text-caption text-fg-muted">
                {t.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          {t.action ? (
            <ToastPrimitive.Action
              altText={t.action.label}
              onClick={t.action.onClick}
              className="text-label font-semibold text-fg underline-offset-4 hover:underline"
            >
              {t.action.label}
            </ToastPrimitive.Action>
          ) : null}
          <ToastPrimitive.Close aria-label="Dismiss" className="text-fg-muted hover:text-fg">
            <X className="size-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed top-0 right-0 z-60 flex w-full flex-col gap-2 p-4 outline-none md:top-auto md:bottom-0 md:max-w-sm" />
    </ToastPrimitive.Provider>
  );
}
