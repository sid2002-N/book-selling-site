import { expect, test } from "@playwright/test";

test.describe("storefront (signed out)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("browse → product → preview without ever requesting a paid file", async ({ page }) => {
    const paid: string[] = [];
    page.on("request", (r) => {
      if (/\/api\/v1\/(reader|downloads)\//.test(r.url()) || r.url().endsWith(".pdf")) paid.push(r.url());
    });
    await page.goto("/");
    await expect(page.getByRole("link", { name: /KRM/ }).first()).toBeVisible();
    await page.goto("/books");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/books/modern-career-playbook");
    await expect(page.getByRole("heading", { level: 1, name: "Modern Career Playbook" })).toBeVisible();
    await expect(page.getByLabel(/Preview of/)).toBeVisible();
    expect(paid).toEqual([]);
  });

  test("guest checkout reaches the payment step and never fakes a payment", async ({ page, request }) => {
    await page.goto("/books/modern-career-playbook");
    const addToCart = page.getByRole("button", { name: /^Add to cart$/i }).first();
    const added = page.waitForResponse((r) => r.url().endsWith("/api/v1/cart/items") && r.request().method() === "POST");
    await addToCart.click();
    expect((await added).ok()).toBe(true);
    await page.goto("/checkout");
    await page.getByLabel("Email address").fill("e2e.guest@example.com");
    await page.getByLabel("Full name").fill("E2E Guest");
    await page.getByRole("button", { name: /Continue to Payment/ }).click();
    await expect(page.getByRole("heading", { name: "Choose payment method" })).toBeVisible();
    // Without provider keys the store says so instead of pretending; with keys a method is selectable.
    const notConfigured = page.getByText(/Online payments aren't switched on yet/);
    const method = page.getByRole("radio", { name: /Razorpay|Stripe/ }).first();
    await expect(notConfigured.or(method).first()).toBeVisible();
    // Prices are never taken from the client: a crafted order request is re-priced or rejected.
    const res = await request.post("/api/v1/checkout/orders", { data: { idempotencyKey: "e2e-tamper-0000001", email: "x@example.com", name: "X", country: "IN", acceptTerms: true, totalMinor: 1 } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("account pages require sign-in, and unknown pages are branded", async ({ page }) => {
    await page.goto("/account/library");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Flibrary/);
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
  });
});

test.describe("tech & culture", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("opens from the menu and shows stories or an honest empty state", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) {
      await page.getByRole("button", { name: /menu/i }).first().click();
    }
    await page.getByRole("link", { name: "Tech & Culture" }).first().click();
    await expect(page).toHaveURL(/\/tech-culture$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tech & Culture" })).toBeVisible();
    // Either live headlines (each opening the publisher in a new tab) or the newsroom-quiet state.
    const story = page.locator("a[target=_blank][rel~=noopener]").first();
    const quiet = page.getByRole("heading", { name: /newsroom is quiet|No stories here yet/ });
    await expect(story.or(quiet).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
