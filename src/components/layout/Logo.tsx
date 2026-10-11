import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark — the period is part of the mark (DESIGN_SYSTEM §2). */
export function Logo({ className, tone = "ink", href = "/" }: { className?: string; tone?: "ink" | "light"; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "font-serif text-h3 font-medium tracking-tight",
        tone === "ink" ? "text-fg" : "text-fg-on-ink",
        className,
      )}
      aria-label="KRM.lib home"
    >
      KRM<span className={tone === "ink" ? "text-accent" : "text-accent-soft"}>.</span>lib
    </Link>
  );
}
