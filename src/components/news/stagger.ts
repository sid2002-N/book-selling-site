import type { CSSProperties } from "react";

/** Inline style carrying a stagger index for Reveal children (usable from server components). */
export const stagger = (i: number) => ({ "--i": Math.min(i, 12) }) as CSSProperties;
