import { expect, test } from "@playwright/test";

test.describe("customer library (demo reader)", () => {
  test("claim a free resource and find it on the shelf", async ({ page }) => {
    await page.goto("/free-resources/daily-planner-template");
    const claim = page.getByRole("button", { name: "Add to My Library" });
    if (await claim.isVisible()) {
      await claim.click();
      await expect(page.getByText("Added to your library").first()).toBeVisible();
    }
    await page.goto("/account/library?q=Daily");
    await expect(page.getByRole("button", { name: /Daily Planner Template/ }).first()).toBeVisible();
  });

  test("the reader resumes on the last page read", async ({ page }) => {
    await page.goto("/account/library?sort=title");
    await page.getByRole("button", { name: /list view/i }).click();
    const detail = page.locator("a[href^='/account/library/']").first();
    const href = await detail.getAttribute("href");
    const id = href!.split("/").pop();
    await page.goto(`/read/${id}?page=1`);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByLabel("Page number")).toHaveValue("3");
    // Progress is saved after a short debounce.
    await page.waitForResponse((r) => r.url().includes(`/api/v1/reader/${id}/progress`) && r.ok());
    await page.goto(`/read/${id}`);
    await expect(page.getByLabel("Page number")).toHaveValue("3");
  });

  test("a download for someone else's item is refused", async ({ page }) => {
    await page.goto("/account");
    const res = await page.request.post("/api/v1/downloads/00000000-0000-7000-8000-000000000000/issue");
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe("DOWNLOAD_UNAUTHORIZED");
  });

  test("download center issues a real file for an owned title", async ({ page }) => {
    await page.goto("/account/downloads?filter=available");
    const button = page.getByRole("button", { name: /^Download/ }).first();
    const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
