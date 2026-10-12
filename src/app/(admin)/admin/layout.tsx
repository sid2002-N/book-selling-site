import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Logo } from "@/components/layout/Logo";
import { Avatar } from "@/components/ui/Feedback";
import { adminNav, type AdminNavGroup } from "@/config/navigation";
import { requireAdminArea, type PermissionKey } from "@/modules/admin";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · KRM.lib" }, robots: { index: false, follow: false } };

/** Dense admin shell (DESIGN_SYSTEM §15): espresso sidebar, top utility bar, cream workspace. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const path = (await headers()).get("x-pathname") ?? "/admin";
  const ctx = await requireAdminArea(path);
  const groups: AdminNavGroup[] = adminNav
    .map((g) => ({ ...g, items: g.items.filter((i) => ctx.permissions.has(i.permission as PermissionKey)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto bg-ink px-3 py-5 lg:flex">
        <div className="flex items-baseline gap-2 px-3">
          <Logo tone="light" href="/admin" className="text-h4" />
          <span className="text-micro font-semibold tracking-wide text-fg-on-ink/60 uppercase">Admin</span>
        </div>
        <AdminSidebar groups={groups} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <AdminMobileNav groups={groups} />
            <Logo href="/admin" className="text-h4 lg:hidden" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="hidden h-8 items-center gap-1.5 rounded-sm px-2.5 text-label font-medium text-fg-secondary hover:bg-canvas-subtle hover:text-fg sm:flex">
              View store
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <div className="flex items-center gap-2 pl-2">
              <Avatar name={ctx.user.name} src={ctx.user.avatarUrl} className="size-8" />
              <div className="hidden flex-col leading-tight md:flex">
                <span className="text-label font-semibold text-fg">{ctx.user.name}</span>
                <span className="text-caption text-fg-muted">{ctx.user.email}</span>
              </div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="flex size-8 items-center justify-center rounded-sm text-fg-muted hover:bg-canvas-subtle hover:text-fg" aria-label="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
