import { test as setup } from "@playwright/test";

/** Signs in once as the DEMO reader and stores the session for the other projects. */
setup("sign in as the demo reader", async ({ page }) => {
  const password = process.env.E2E_READER_PASSWORD ?? process.env.SEED_READER_PASSWORD;
  if (!password) throw new Error("Set E2E_READER_PASSWORD (or SEED_READER_PASSWORD) to the demo reader's password");
  await page.goto("/login?next=/account");
  await page.getByLabel("Email").fill(process.env.E2E_READER_EMAIL ?? "reader@krmlib.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => url.pathname === "/account");
  await page.context().storageState({ path: "tests/e2e/.auth/reader.json" });
});
