"use client";

import { Bell, Heart, Menu as MenuIcon, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { primaryNav, compactNav, type NavLink } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Feedback";
import { Logo } from "./Logo";

export type HeaderUser = { name: string; avatarUrl?: string | null } | null;

type SiteHeaderProps = {
  user: HeaderUser;
  cartCount?: number;
  variant?: "default" | "compact";
  onOpenSearch?: () => void;
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Storefront header (DESIGN_SYSTEM §12.1): light by default, compact + glass once scrolled.
 * On mobile the nav moves to a drawer and the bottom bar; search, wishlist, cart stay on top.
 */
export function SiteHeader({ user, cartCount = 0, variant = "default", onOpenSearch }: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const links: NavLink[] = variant === "compact" ? compactNav : primaryNav;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const searchHref = "/search";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,padding] duration-normal",
        scrolled ? "glass rounded-none border-x-0 border-t-0 py-2" : "bg-transparent py-3 md:py-4",
      )}
    >
      <div className="container-page flex items-center gap-4">
        <MobileNavDrawer links={links} pathname={pathname} />
        <Logo />

        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-label font-medium whitespace-nowrap transition-colors duration-fast",
                      active ? "bg-surface text-fg shadow-1" : "text-fg-secondary hover:text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {onOpenSearch ? (
            <button
              type="button"
              onClick={onOpenSearch}
              className="hidden h-10 w-72 items-center gap-2 rounded-full border border-line bg-surface/80 px-4 text-left text-body-sm whitespace-nowrap text-fg-muted hover:border-line-strong xl:flex"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 truncate">Search books, guides, topics…</span>
              <kbd className="rounded-sm border border-line px-1.5 text-micro text-fg-muted">/</kbd>
            </button>
          ) : (
            <Link
              href={searchHref}
              className="hidden h-10 w-72 items-center gap-2 rounded-full border border-line bg-surface/80 px-4 text-body-sm whitespace-nowrap text-fg-muted hover:border-line-strong xl:flex"
            >
              <Search className="size-4" aria-hidden />
              Search books, guides, topics…
            </Link>
          )}
          <HeaderIcon
            label="Search"
            className="xl:hidden"
            {...(onOpenSearch ? { onClick: onOpenSearch } : { href: searchHref })}
          >
            <Search />
          </HeaderIcon>
          <HeaderIcon label="Wishlist" href="/account/wishlist" className="hidden sm:flex">
            <Heart />
          </HeaderIcon>
          <HeaderIcon label={cartCount ? `Cart, ${cartCount} items` : "Cart"} href="/cart" badge={cartCount}>
            <ShoppingBag />
          </HeaderIcon>
          {user ? (
            <>
              <HeaderIcon label="Notifications" href="/account/notifications" className="hidden md:flex">
                <Bell />
              </HeaderIcon>
              <Link href="/account" className="ml-1 rounded-full" aria-label={`Account for ${user.name}`}>
                <Avatar name={user.name} src={user.avatarUrl} />
              </Link>
            </>
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderIcon({
  label,
  href,
  onClick,
  badge,
  className,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "relative flex size-10 items-center justify-center rounded-full text-fg-secondary transition-colors duration-fast hover:bg-surface hover:text-fg [&_svg]:size-5",
    className,
  );
  const content = (
    <>
      {children}
      {badge ? (
        <span
          aria-hidden
          className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-micro text-white"
        >
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} aria-label={label} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

function MobileNavDrawer({ links, pathname }: { links: NavLink[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent variant="drawer-left" title="Menu" hideTitle>
        <div className="mb-6">
          <Logo />
        </div>
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className="flex h-11 items-center rounded-md px-3 text-body font-medium text-fg-secondary hover:bg-canvas-subtle aria-[current=page]:bg-canvas-subtle aria-[current=page]:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
