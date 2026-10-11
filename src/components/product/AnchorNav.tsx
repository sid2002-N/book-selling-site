"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Pill anchor bar for product sections; highlights the section in view. */
export function AnchorNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);
  return (
    <nav aria-label="Product sections" className="sticky top-16 z-20 -mx-4 bg-canvas/90 px-4 py-3 backdrop-blur-sm md:top-20">
      <ul className="flex gap-2 overflow-x-auto scrollbar-none">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-4 text-label font-medium transition-colors duration-fast",
                active === item.id ? "border-ink bg-ink text-fg-on-ink" : "border-line bg-surface text-fg-secondary hover:text-fg",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
