"use client";

import { Download, Heart, LayoutDashboard, Library, Receipt, Settings, ShieldCheck, Star, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "My Library", href: "/account/library", icon: Library },
  { label: "Downloads", href: "/account/downloads", icon: Download },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Orders", href: "/account/orders", icon: Receipt },
  { label: "Reviews", href: "/account/reviews", icon: Star },
  { label: "Settings", href: "/account/settings", icon: Settings },
  { label: "Security", href: "/account/security", icon: ShieldCheck },
];

/** Calm cream sidebar (DESIGN_SYSTEM §12.3); a scrollable pill row on small screens. */
export function AccountSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));
  return (
    <nav aria-label="Account">
      <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:gap-1 lg:overflow-visible">
        {items.map(({ label, href, icon: Icon }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-full px-4 text-label font-medium whitespace-nowrap transition-colors duration-fast lg:rounded-md",
                isActive(href) ? "bg-surface text-fg shadow-1" : "text-fg-secondary hover:bg-surface/60 hover:text-fg",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
