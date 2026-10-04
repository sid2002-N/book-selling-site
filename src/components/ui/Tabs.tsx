"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

/** Pill tab bar; scrolls horizontally on small screens (DESIGN_SYSTEM §14). */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none]", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger className={cn(pillClasses, className)} {...props} />
  );
}

export const pillClasses = cn(
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-label font-medium text-fg-secondary",
  "transition-colors duration-fast hover:border-line-strong hover:text-fg",
  "data-[state=active]:border-ink data-[state=active]:bg-ink data-[state=active]:text-fg-on-ink",
  "aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-fg-on-ink",
);

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
}
