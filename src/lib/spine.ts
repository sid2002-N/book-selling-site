/**
 * Deterministic book-spine geometry and colour helpers for the library shelf
 * (DESIGN_SYSTEM §18). Same product id ⇒ same spine on every render and server.
 */

/** Curated admin presets — deep green, navy-teal, burgundy, ochre, espresso, olive, rust, teal. */
export const SPINE_PALETTE = [
  "#2F4A3A",
  "#1F3B4D",
  "#6B2A3A",
  "#B7832F",
  "#3B2A20",
  "#5A5A2E",
  "#9A4A2A",
  "#24504F",
] as const;

export const SPINE_WIDTH = { min: 28, max: 56 } as const;
export const SPINE_HEIGHT = { min: 188, max: 236 } as const;

/** FNV-1a 32-bit — tiny, stable, good enough spread for layout jitter. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function spineSize(id: string): { width: number; height: number } {
  const h = hashString(id);
  const width = SPINE_WIDTH.min + (h % (SPINE_WIDTH.max - SPINE_WIDTH.min + 1));
  const height = SPINE_HEIGHT.min + ((h >>> 8) % (SPINE_HEIGHT.max - SPINE_HEIGHT.min + 1));
  return { width, height };
}

const HEX = /^#?([0-9a-f]{6})$/i;

export function isValidHex(value: string): boolean {
  return HEX.test(value);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match?.[1]) throw new Error(`Invalid hex colour: ${hex}`);
  const n = parseInt(match[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT_TEXT = "#F8EEDF";
const DARK_TEXT = "#2A1D16";

/** Picks the spine title colour with the higher contrast so titles stay legible (AA). */
export function spineTextColor(background: string): string {
  return contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
}

/** Fallback colour for products without a valid `spineColor`. */
export function fallbackSpineColor(id: string): string {
  return SPINE_PALETTE[hashString(id) % SPINE_PALETTE.length] ?? SPINE_PALETTE[0];
}
