import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test as setup, type Page } from "@playwright/test";
import { Secret, TOTP } from "otpauth";

const SECRET_FILE = "tests/e2e/.auth/admin-totp.txt";

async function typeCode(page: Page, secret: string) {
  const code = new TOTP({ secret: Secret.fromBase32(secret) }).generate();
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(code);
}

/**
 * Signs in as the DEMO admin and satisfies mandatory 2FA. On the first run it enables 2FA through
 * the real setup screen and keeps the (test-only) setup key under tests/e2e/.auth for later runs.
 */
setup("sign in as the demo admin with 2FA", async ({ page }) => {
  const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("Set E2E_ADMIN_PASSWORD (or SEED_ADMIN_PASSWORD) to the demo admin's password");
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL ?? "admin@krmlib.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  // Sign-in lands on /admin, which redirects to 2FA setup or the 2FA challenge when needed.
  const setupButton = page.getByRole("button", { name: "Set Up 2FA" });
  const verifyButton = page.getByRole("button", { name: "Verify", exact: true });
  const adminNav = page.getByRole("navigation", { name: "Admin" });
  await expect(setupButton.or(verifyButton).or(adminNav).first()).toBeVisible({ timeout: 15_000 });

  if (await setupButton.isVisible()) {
    await setupButton.click();
    const secret = (await page.locator("code").first().textContent())!.trim();
    mkdirSync("tests/e2e/.auth", { recursive: true });
    writeFileSync(SECRET_FILE, secret);
    await typeCode(page, secret);
    await page.getByRole("button", { name: /Verify & enable/i }).click();
    await page.getByRole("button", { name: "Continue" }).click();
  } else if (await verifyButton.isVisible()) {
    if (!existsSync(SECRET_FILE)) throw new Error(`The demo admin already has 2FA but ${SECRET_FILE} is missing. Reset the admin's 2FA or provide the setup key.`);
    // Codes are single-use (replay protection), so a code used by a recent run is refused:
    // wait for the next 30-second step before answering the challenge.
    await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500);
    await typeCode(page, readFileSync(SECRET_FILE, "utf8").trim());
    await verifyButton.click();
  }
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
