import { describe, expect, it } from "vitest";
import { pageWindow } from "@/components/ui/Pagination";

describe("pageWindow", () => {
  it("shows every page when the range is small", () => {
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });
  it("collapses distant pages into gaps", () => {
    expect(pageWindow(10, 26)).toEqual([1, null, 9, 10, 11, null, 26]);
  });
  it("handles the first page", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
  });
});
