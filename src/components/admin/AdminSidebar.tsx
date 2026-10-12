"use client";

import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  MessageSquareText,
  NotebookText,
  Receipt,
  RotateCcw,
  ShieldCheck,
  TicketPercent,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavGroup, AdminNavIcon } from "@/config/navigation";
import { cn } from "@/lib/cn";

const ICONS: Record<AdminNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  products: NotebookText,
  categories: FolderTree,
  orders: Receipt,
  refunds: RotateCcw,
  payments: Wallet,
  customers: Users,
  reviews: MessageSquareText,
  coupons: TicketPercent,
  audit: ShieldCheck,
};

/** Espresso admin sidebar (DESIGN_SYSTEM §15); only items the admin may open are passed in. */
export function AdminSidebar({ groups, onNavigate }: { groups: AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-0.5">
          {group.label ? <p className="px-3 pb-1 text-micro font-semibold tracking-wide text-fg-on-ink/55 uppercase">{group.label}</p> : null}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon] ?? ClipboardList;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-sm px-3 text-label font-medium transition-colors duration-fast",
                  active ? "bg-plum text-fg-on-ink" : "text-fg-on-ink/80 hover:bg-ink-soft hover:text-fg-on-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
