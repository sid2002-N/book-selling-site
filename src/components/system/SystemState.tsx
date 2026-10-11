import {
  Archive,
  BookOpen,
  Bot,
  Cat,
  DoorClosed,
  Heart,
  Lamp,
  LockKeyhole,
  type LucideIcon,
  Mountain,
  PackageOpen,
  SearchX,
  ShoppingCart,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type SystemVariant =
  | "not-found"
  | "server-error"
  | "forbidden"
  | "unauthorized"
  | "maintenance"
  | "offline"
  | "network"
  | "generic"
  | "empty-search"
  | "empty-library"
  | "empty-orders"
  | "empty-wishlist"
  | "empty-cart";

type Action = { label: string; href?: string; onClick?: () => void };

type VariantSpec = {
  code?: string;
  title: string;
  message: string;
  sign: string;
  icon: LucideIcon;
  primary: Action;
  secondary?: Action;
};

/**
 * Copy and illustration per state, from the Error State Showcase sheet. The handwritten
 * "sign" microcopy is part of each scene (DESIGN_SYSTEM §13).
 */
export const systemVariants: Record<SystemVariant, VariantSpec> = {
  "not-found": {
    code: "404",
    title: "Page Not Found",
    message: "Looks like this page doesn't exist or has been moved.",
    sign: "Wrong turn? Let's find something better.",
    icon: Cat,
    primary: { label: "Go Home", href: "/" },
    secondary: { label: "Browse Books", href: "/books" },
  },
  "server-error": {
    code: "500",
    title: "Server Error",
    message: "Something went wrong on our end. Our team has been notified and we're working on a fix.",
    sign: "Oops! Even servers need a break sometimes.",
    icon: Bot,
    primary: { label: "Try Again" },
    secondary: { label: "Go Home", href: "/" },
  },
  forbidden: {
    code: "403",
    title: "Access Forbidden",
    message: "You don't have permission to access this page.",
    sign: "Good things live beyond permission.",
    icon: DoorClosed,
    primary: { label: "Go Home", href: "/" },
  },
  unauthorized: {
    code: "401",
    title: "Unauthorized",
    message: "Please sign in to access this page.",
    sign: "A small login for you, a larger library for you.",
    icon: LockKeyhole,
    primary: { label: "Sign In", href: "/login" },
    secondary: { label: "Go Home", href: "/" },
  },
  maintenance: {
    title: "We'll Be Back Soon",
    message: "KRM.lib is currently under maintenance to serve you better. We'll be back shortly.",
    sign: "Polishing our shelves for a better experience.",
    icon: Lamp,
    primary: { label: "Go Home", href: "/" },
  },
  offline: {
    title: "You're Offline",
    message: "It looks like you're not connected to the internet. Please check your connection and try again.",
    sign: "No network. Same curiosity.",
    icon: Mountain,
    primary: { label: "Try Again" },
    secondary: { label: "Go Home", href: "/" },
  },
  network: {
    title: "Network Error",
    message: "We couldn't reach our servers. Please check your connection and try again.",
    sign: "The signal is taking a break. Let's try again.",
    icon: WifiOff,
    primary: { label: "Try Again" },
  },
  generic: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Our team has been notified.",
    sign: "Even the best plans sometimes hit a snag.",
    icon: Cat,
    primary: { label: "Try Again" },
    secondary: { label: "Go Home", href: "/" },
  },
  "empty-search": {
    title: "No Results Found",
    message: "We couldn't find anything matching your search. Try different keywords or explore popular categories.",
    sign: "Different words. Same knowledge waiting.",
    icon: SearchX,
    primary: { label: "Clear Search", href: "/search" },
    secondary: { label: "Browse Collections", href: "/collections" },
  },
  "empty-library": {
    title: "Your Library is Empty",
    message: "You haven't added any books to your library yet. Start exploring and add your first book.",
    sign: "Every great library starts with a single book.",
    icon: BookOpen,
    primary: { label: "Browse Books", href: "/books" },
    secondary: { label: "View Collections", href: "/collections" },
  },
  "empty-orders": {
    title: "No Orders Yet",
    message: "You haven't placed any orders yet. Explore our collection of digital books, guides and resources.",
    sign: "Good ideas are just a click away.",
    icon: PackageOpen,
    primary: { label: "Browse Books", href: "/books" },
    secondary: { label: "View Deals", href: "/deals" },
  },
  "empty-wishlist": {
    title: "Your Wishlist is Empty",
    message: "Save books, guides and resources you're interested in to view them here.",
    sign: "Keep a list of ideas for a brighter tomorrow.",
    icon: Heart,
    primary: { label: "Explore Books", href: "/books" },
    secondary: { label: "View Popular", href: "/popular" },
  },
  "empty-cart": {
    title: "Your Cart is Empty",
    message: "Looks like you haven't added anything to your cart yet.",
    sign: "Fill this cart with ideas that move you forward.",
    icon: ShoppingCart,
    primary: { label: "Browse Books", href: "/books" },
    secondary: { label: "Explore Collections", href: "/collections" },
  },
};

type SystemStateProps = {
  variant: SystemVariant;
  /** Overrides for context-specific copy (e.g. the search term). */
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  primary?: Action;
  secondary?: Action | null;
  children?: ReactNode;
  /** `page` fills the viewport section; `inline` sits inside an existing layout. */
  layout?: "page" | "inline";
  headingLevel?: "h1" | "h2";
  className?: string;
};

/** One template for every error and empty state (master §30, §63). */
export function SystemState({
  variant,
  title,
  message,
  onRetry,
  primary,
  secondary,
  children,
  layout = "page",
  headingLevel = "h1",
  className,
}: SystemStateProps) {
  const spec = systemVariants[variant];
  const Icon = spec.icon;
  const Heading = headingLevel;
  const primaryAction = primary ?? spec.primary;
  const secondaryAction = secondary === null ? undefined : (secondary ?? spec.secondary);

  return (
    <section
      className={cn(
        "grid items-center gap-10 md:grid-cols-2",
        layout === "page" ? "container-page py-12 md:py-20" : "rounded-xl border border-line bg-surface p-6 md:p-10",
        className,
      )}
    >
      <div className="flex flex-col items-start gap-4">
        {spec.code ? (
          <p className="font-serif text-display leading-none text-fg" aria-hidden>
            {spec.code}
          </p>
        ) : null}
        <Heading className={cn(spec.code ? "text-h2" : "text-h1", "text-fg")}>
          {spec.code ? <span className="sr-only">{spec.code} — </span> : null}
          {title ?? spec.title}
        </Heading>
        <p className="max-w-md text-body text-fg-secondary">{message ?? spec.message}</p>
        {children}
        <div className="mt-2 flex flex-wrap gap-3">
          <ActionButton action={primaryAction} onRetry={onRetry} variant="primary" />
          {secondaryAction ? <ActionButton action={secondaryAction} onRetry={onRetry} variant="secondary" /> : null}
        </div>
      </div>
      <StateIllustration icon={Icon} sign={spec.sign} />
    </section>
  );
}

function ActionButton({
  action,
  onRetry,
  variant,
}: {
  action: Action;
  onRetry?: () => void;
  variant: "primary" | "secondary";
}) {
  if (action.href) {
    return (
      <Button asChild variant={variant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  const handler = action.onClick ?? onRetry;
  if (!handler) return null;
  return (
    <Button variant={variant} onClick={handler}>
      {action.label}
    </Button>
  );
}

/**
 * Illustration slot. Final scene art is pending (OQ-12); until then a calm composition of the
 * scene's motif and its handwritten sign keeps the state recognisably KRM.lib.
 */
function StateIllustration({ icon: Icon, sign }: { icon: LucideIcon; sign: string }) {
  return (
    <div aria-hidden className="relative mx-auto flex aspect-4/3 w-full max-w-md items-end justify-center">
      <div className="absolute inset-x-6 bottom-6 h-3 rounded-full bg-line" />
      <div className="absolute inset-x-0 bottom-0 top-8 rounded-xl bg-canvas-subtle" />
      <div className="relative mb-12 flex items-end gap-6">
        <div className="flex size-28 items-center justify-center rounded-full bg-accent-soft text-accent-strong md:size-36">
          <Icon className="size-14 md:size-16" strokeWidth={1.25} />
        </div>
        <div className="mb-6 max-w-40 -rotate-3 rounded-md border border-line-strong bg-surface-raised px-4 py-3 shadow-2">
          <p className="font-serif text-body-sm text-fg-secondary italic">{sign}</p>
        </div>
      </div>
      <Archive className="absolute bottom-10 left-8 size-6 text-line-strong" strokeWidth={1.25} />
    </div>
  );
}
