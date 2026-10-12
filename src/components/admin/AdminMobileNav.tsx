"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import type { AdminNavGroup } from "@/config/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { AdminSidebar } from "./AdminSidebar";

export function AdminMobileNav({ groups }: { groups: AdminNavGroup[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex size-9 items-center justify-center rounded-sm text-fg-secondary hover:bg-canvas-subtle lg:hidden" aria-label="Open admin menu">
        <Menu className="size-5" />
      </DialogTrigger>
      <DialogContent variant="drawer-left" title="Admin menu" className="bg-ink text-fg-on-ink [&_h2]:text-fg-on-ink">
        <AdminSidebar groups={groups} onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
