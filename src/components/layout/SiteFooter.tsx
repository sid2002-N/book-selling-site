import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Glow, Steam } from "@/components/illustration/Atmosphere";
import { ILLUSTRATIONS } from "@/config/illustrations";
import { footerNav } from "@/config/navigation";
import { Logo } from "./Logo";

type SiteFooterProps = {
  tagline?: string;
  quote?: string;
  copyright?: string;
  /** Slot beside the copyright line (currency switcher). */
  utility?: ReactNode;
  /** 3:1 illustration shown as the footer's closing scene; null keeps the plain footer. */
  scene?: string | null;
};

/** Dark espresso footer (DESIGN_SYSTEM §12.2). Copy comes from settings, with brand defaults. */
export function SiteFooter({
  tagline = "Knowledge Resource & Management. Practical knowledge for a better you.",
  quote = "A small library for a bigger tomorrow.",
  copyright = `© ${new Date().getFullYear()} KRM.lib. All rights reserved.`,
  utility,
  scene = ILLUSTRATIONS.footer,
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
        {scene ? null : (
          <blockquote className="self-center font-serif text-h4 text-fg-on-ink/85 italic md:col-span-2 lg:col-span-1">
            “{quote}”
          </blockquote>
        )}
      </div>
      {scene ? (
        <div className="relative flex min-h-56 items-center justify-center overflow-hidden border-t border-white/10 lg:aspect-3/1">
          <Image src={scene} alt="" aria-hidden fill sizes="100vw" className="object-cover" />
          {/* At lg+ the band is exactly 3:1 like the art, so the lantern, mug and window line up. */}
          <div aria-hidden className="absolute inset-0 hidden lg:block">
            <Glow kind="flame" at={{ left: "20%", top: "52%", width: "7%", height: "22%" }} />
            <Glow at={{ left: "78%", top: "0%", width: "20%", height: "55%" }} />
            <Steam at={{ left: "81.5%", top: "44%", width: "4.5%", height: "20%" }} />
          </div>
          <blockquote className="relative px-6 text-center font-serif text-h2 text-fg-on-ink italic">“{quote}”</blockquote>
        </div>
      ) : null}
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-caption text-fg-on-ink/60">{copyright}</p>
          {utility}
        </div>
      </div>
    </footer>
  );
}
