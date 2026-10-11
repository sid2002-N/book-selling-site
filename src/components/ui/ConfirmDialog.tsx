"use client";

import { AlertDialog as AlertPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
};

/** Protects destructive or irreversible actions (DESIGN_SYSTEM §9, §15). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  loading,
  icon,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-fade-in" />
        <AlertPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 rounded-xl border border-line bg-surface-raised p-6 text-center shadow-3 data-[state=open]:animate-rise-in">
          {icon ? <div className="text-terracotta">{icon}</div> : null}
          <AlertPrimitive.Title className="text-h3 text-fg">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description className="text-body-sm text-fg-muted">
            {description}
          </AlertPrimitive.Description>
          <div className="mt-2 flex w-full gap-3">
            <AlertPrimitive.Cancel asChild>
              <Button variant="secondary" block>
                {cancelLabel}
              </Button>
            </AlertPrimitive.Cancel>
            <Button
              variant={destructive ? "destructive" : "primary"}
              block
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
