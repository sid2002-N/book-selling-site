import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

test.describe.configure({ mode: "serial" });

test("admin creates a book, publish stays blocked until complete, then it appears on the store", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const title = `E2E Field Notes ${stamp}`;

  await page.goto("/admin/products/new");
  await page.getByRole("radio", { name: /^Book/ }).check();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/admin\/products\/[^/]+\?step=details/);
  const productUrl = page.url().split("?")[0]!;

  // Publishing an incomplete product is refused by the server.
  await page.goto(`${productUrl}?step=review`);
  await page.getByRole("main").getByRole("button", { name: "Publish" }).first().click();
  await expect(page.getByText("This product isn't ready to publish yet.").first()).toBeVisible();

  await page.goto(`${productUrl}?step=details`);
  await page.getByLabel("Short description").fill("Notes from the field, written for testing.");
  await page.getByLabel("Full description").fill("A demo product created by the end-to-end suite to prove that publishing from the admin reaches the store.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Changes saved").first()).toBeVisible();

  await page.goto(`${productUrl}?step=pricing`);
  await page.getByLabel("Price (₹ INR)").fill("299");
  await page.getByLabel("Price ($ USD)").fill("4.99");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Changes saved").first()).toBeVisible();

  await page.goto(`${productUrl}?step=categories`);
  await page.getByLabel("Primary category").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Changes saved").first()).toBeVisible();

  const tmp = test.info().outputPath();
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  pdf.addPage([300, 400]);
  const pdfPath = path.join(tmp, "notes.pdf");
  const pngPath = path.join(tmp, "page.png");
  mkdirSync(tmp, { recursive: true });
  writeFileSync(pdfPath, await pdf.save());
  writeFileSync(pngPath, await sharp({ create: { width: 600, height: 800, channels: 3, background: "#f5ecdf" } }).png().toBuffer());

  await page.goto(`${productUrl}?step=file`);
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Upload as new version" }).click();
  await expect(page.getByText("Uploaded").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: /2 pages/ })).toBeVisible();

  await page.goto(`${productUrl}?step=previews`);
  await page.locator('input[type="file"]').setInputFiles(pngPath);
  await page.getByRole("button", { name: "Add preview page" }).click();
  await expect(page.getByRole("img", { name: /Sample pages/ })).toBeVisible();

  await page.goto(`${productUrl}?step=review`);
  await page.getByRole("main").getByRole("button", { name: "Publish" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/Published — it's now on the shelf/).first()).toBeVisible();

  await page.goto(`/search?q=${encodeURIComponent(stamp)}`);
  await expect(page.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();

  // Leave the demo catalogue as we found it: unpublish, then archive the test book.
  await page.goto(productUrl);
  await page.getByRole("button", { name: "Unpublish" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText(/Unpublished/).first()).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("button", { name: "Restore as draft" })).toBeVisible();
});

test("admin sees orders, customers and the audit trail of that publish", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
  await page.goto("/admin/customers");
  await expect(page.getByRole("link", { name: "Demo Reader" })).toBeVisible();
  await page.goto("/admin/audit?q=product.publish");
  await expect(page.getByRole("cell", { name: "product.publish" }).first()).toBeVisible();
});

test.describe("non-admins", () => {
  test.use({ storageState: "tests/e2e/.auth/reader.json" });
  test("a customer is turned away from the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/403/);
  });
});
