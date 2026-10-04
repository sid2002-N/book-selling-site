"use client";

import { Compass, House, Library, Receipt, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { label: "Home", href: "/", icon: House },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Library", href: "/account/library", icon: Library },
  { label: "Orders", href: "/account/orders", icon: Receipt },
  { label: "Account", href: "/account", icon: UserRound },
] as const;

/** Bottom bar for phones (DESIGN_SYSTEM §12.5): max five destinations, glass, safe-area aware. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const activeHref =
    [...items]
      .map((i) => i.href as string)
      .sort((a, b) => b.length - a.length)
      .find((href) => (href === "/" ? pathname === "/" : pathname.startsWith(href))) ?? null;

  return (
    <nav aria-label="Mobile primary" className="glass fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 pb-safe md:hidden">
      <ul className="grid h-16 grid-cols-5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = activeHref === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-micro font-medium normal-case",
                  active ? "text-fg" : "text-fg-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
