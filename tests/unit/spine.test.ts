import { describe, expect, it } from "vitest";
import {
  SPINE_HEIGHT,
  SPINE_PALETTE,
  SPINE_WIDTH,
  contrastRatio,
  fallbackSpineColor,
  spineSize,
  spineTextColor,
} from "@/lib/spine";

describe("spineSize", () => {
  it("is deterministic for the same id", () => {
    expect(spineSize("prod_123")).toEqual(spineSize("prod_123"));
  });

  it("stays within the configured bands", () => {
    for (let i = 0; i < 500; i++) {
      const { width, height } = spineSize(`product-${i}`);
      expect(width).toBeGreaterThanOrEqual(SPINE_WIDTH.min);
      expect(width).toBeLessThanOrEqual(SPINE_WIDTH.max);
      expect(height).toBeGreaterThanOrEqual(SPINE_HEIGHT.min);
      expect(height).toBeLessThanOrEqual(SPINE_HEIGHT.max);
    }
  });

  it("varies across ids so the shelf looks organic", () => {
    const widths = new Set(Array.from({ length: 50 }, (_, i) => spineSize(`p${i}`).width));
    expect(widths.size).toBeGreaterThan(10);
  });
});

describe("spineTextColor", () => {
  it("meets AA (4.5:1) for every palette preset", () => {
    for (const colour of SPINE_PALETTE) {
      expect(contrastRatio(colour, spineTextColor(colour))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses dark text on light spines", () => {
    expect(spineTextColor("#F6E7C8")).toBe("#2A1D16");
  });
});

describe("fallbackSpineColor", () => {
  it("returns a palette colour deterministically", () => {
    expect(SPINE_PALETTE).toContain(fallbackSpineColor("abc"));
    expect(fallbackSpineColor("abc")).toBe(fallbackSpineColor("abc"));
  });
});
