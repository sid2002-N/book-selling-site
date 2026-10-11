import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the KRM token names so `text-h1` and `text-fg` don't collapse into one group.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "caption", "label", "body-sm", "body", "body-lg", "h4", "h3", "h2", "h1", "display", "price"],
      shadow: ["1", "2", "3"],
      radius: ["cover"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
