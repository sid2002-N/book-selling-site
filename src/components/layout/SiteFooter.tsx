import Link from "next/link";
import { footerNav } from "@/config/navigation";
import { Logo } from "./Logo";

type SiteFooterProps = {
  tagline?: string;
  quote?: string;
  copyright?: string;
};

/** Dark espresso footer (DESIGN_SYSTEM §12.2). Copy comes from settings, with brand defaults. */
export function SiteFooter({
  tagline = "Knowledge Resource & Management. Practical knowledge for a better you.",
  quote = "A small library for a bigger tomorrow.",
  copyright = `© ${new Date().getFullYear()} KRM.lib. All rights reserved.`,
}: SiteFooterProps) {
  return (
    <footer className="mt-auto bg-ink text-fg-on-ink">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 md:py-16 lg:grid-cols-6">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Logo tone="light" />
          <p className="max-w-xs text-body-sm text-fg-on-ink/70">{tagline}</p>
        </div>
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-3 font-sans text-label font-semibold text-fg-on-ink">{group.title}</h2>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-body-sm text-fg-on-ink/70 hover:text-fg-on-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <blockquote className="self-center font-serif text-h4 text-fg-on-ink/85 italic md:col-span-2 lg:col-span-1">
          “{quote}”
        </blockquote>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-caption text-fg-on-ink/60">{copyright}</p>
      </div>
    </footer>
  );
}
