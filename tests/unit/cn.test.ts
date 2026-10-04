import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("keeps a token font size and a token colour together", () => {
    expect(cn("text-h1 text-fg")).toBe("text-h1 text-fg");
  });
  it("lets later classes override earlier ones in the same group", () => {
    expect(cn("bg-surface", "bg-ink")).toBe("bg-ink");
    expect(cn("shadow-1", "shadow-3")).toBe("shadow-3");
  });
});
