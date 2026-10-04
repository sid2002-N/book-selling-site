"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const contentVariants = cva(
  "fixed z-50 flex flex-col bg-surface-raised text-fg shadow-3 outline-none focus-visible:outline-none data-[state=open]:animate-rise-in",
  {
    variants: {
      variant: {
        /** Centred modal. */
        modal:
          "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line",
        /** Mobile bottom sheet with drag-handle affordance. */
        sheet:
          "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl border-t border-line pb-safe data-[state=open]:animate-sheet-up",
        /** Side drawer (filters, cart, nav). */
        drawer: "inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-line",
        "drawer-left": "inset-y-0 left-0 w-full max-w-xs overflow-y-auto border-r border-line",
        /** Command search. */
        command:
          "top-[12vh] left-1/2 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl glass",
      },
    },
    defaultVariants: { variant: "modal" },
  },
);

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof contentVariants> & {
    title: ReactNode;
    description?: ReactNode;
    hideTitle?: boolean;
    hideClose?: boolean;
  };

export function DialogContent({
  className,
  variant,
  title,
  description,
  hideTitle,
  hideClose,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content className={cn(contentVariants({ variant }), className)} {...props}>
        {variant === "sheet" ? (
          <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
        ) : null}
        <div className={cn("flex items-start justify-between gap-4 px-6 pt-5", hideTitle && "sr-only")}>
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-h3 text-fg">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-body-sm text-fg-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
        </div>
        {!description ? <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description> : null}
        <div className="px-6 pt-4 pb-6">{children}</div>
        {!hideClose ? (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-canvas-subtle hover:text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
