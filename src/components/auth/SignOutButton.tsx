"use client";

import { LogOut } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Sign-out with the "Sign Out?" confirmation from the Authentication Storyboard. */
export function SignOutButton({ action, children, className }: { action: () => Promise<void>; children?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children ?? (
          <>
            <LogOut className="size-4" aria-hidden /> Sign out
          </>
        )}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        icon={<LogOut className="size-8" />}
        title="Sign Out?"
        description="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        loading={pending}
        onConfirm={() => startTransition(() => action())}
      />
    </>
  );
}
