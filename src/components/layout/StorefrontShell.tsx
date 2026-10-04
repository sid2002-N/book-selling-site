import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { MobileBottomNav } from "./MobileBottomNav";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader, type HeaderUser } from "./SiteHeader";

type StorefrontShellProps = {
  children: ReactNode;
  user?: HeaderUser;
  cartCount?: number;
  headerVariant?: "default" | "compact";
};

/** Header + main + footer + mobile bottom nav, shared by storefront pages and system states. */
export function StorefrontShell({ children, user = null, cartCount = 0, headerVariant = "default" }: StorefrontShellProps) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-fg-on-ink"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <SiteHeader user={user} cartCount={cartCount} variant={headerVariant} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {/* Keeps the footer clear of the fixed bottom bar on phones. */}
      <div aria-hidden className="h-16 bg-ink pb-safe md:hidden" />
      <MobileBottomNav />
    </>
  );
}
