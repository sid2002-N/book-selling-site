import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function SectionHeader({ eyebrow, title, href, linkLabel = "View all", id, className }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; id?: string; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        {eyebrow ? <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">{eyebrow}</p> : null}
        <h2 id={id} className="text-h2 text-fg">
          {title}
        </h2>
      </div>
      {href ? (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-label font-medium text-fg-secondary hover:text-fg">
          {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
