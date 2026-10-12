"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Staggered scroll reveal. Children animate in once when the group enters the viewport; each
 * child should set `style={{ "--i": index }}`. With reduced motion or no JS nothing is hidden
 * (see the [data-reveal] rules in globals.css).
 */
export function Reveal({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.setAttribute("data-shown", "");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute("data-shown", "");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} data-reveal="" className={cn(className)}>
      {children}
    </Tag>
  );
}
