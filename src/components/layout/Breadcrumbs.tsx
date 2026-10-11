import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; href?: string };

/** Visible breadcrumbs plus BreadcrumbList JSON-LD (DESIGN_SYSTEM §12.6). */
export function Breadcrumbs({ items, baseUrl, className }: { items: Crumb[]; baseUrl?: string; className?: string }) {
  const jsonLd = baseUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.label,
          ...(c.href ? { item: new URL(c.href, baseUrl).toString() } : {}),
        })),
      }
    : null;
  return (
    <nav aria-label="Breadcrumb" className={cn("text-caption text-fg-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-fg-secondary" : undefined}>
                  {c.label}
                </span>
              )}
              {!last ? <ChevronRight className="size-3" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped cannot break out of the script element.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      ) : null}
    </nav>
  );
}
