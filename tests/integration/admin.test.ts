import { Secret, TOTP } from "otpauth";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { DEFAULT_ROLES, PERMISSIONS } from "@/modules/admin/permissions";
import { beginTwoFactorSetup, confirmTwoFactorSetup, register } from "@/modules/auth";
import {
  blockCustomer,
  createCoupon,
  createProduct,
  getProductForEdit,
  moderateReview,
  publishProduct,
  publishVersion,
  unblockCustomer,
  updateProductSection,
  uploadPreview,
  uploadVersion,
} from "@/modules/backoffice";
import { listProducts as listCatalog } from "@/modules/catalog";
import { cookieJar } from "../helpers/cookie-jar";

const ctx = { ip: "203.0.113.70", userAgent: "vitest", requestId: "t" };

async function seedRoles() {
  for (const [key, description] of Object.entries(PERMISSIONS)) await db.permission.create({ data: { key, description } });
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    await db.adminRole.create({ data: { key, name: role.name, isSystem: true, permissions: { create: role.permissions.map((permissionKey) => ({ permissionKey })) } } });
  }
}

/** Registers (and signs in) a user, makes them an admin with `role`, and completes 2FA. */
async function signInAdmin(email: string, role: string) {
  cookieJar.clear();
  const { userId } = await register({ name: "Asha Admin", email, password: "readmore42" }, ctx);
  const r = await db.adminRole.findUniqueOrThrow({ where: { key: role } });
  await db.adminUser.create({ data: { userId, roles: { create: { roleId: r.id } } } });
  await beginTwoFactorSetup();
  const record = await db.twoFactor.findUniqueOrThrow({ where: { userId } });
  await confirmTwoFactorSetup(new TOTP({ secret: Secret.fromBase32(decrypt(record.secretEncrypted)) }).generate());
  return userId;
}

async function samplePdf(pages = 3) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) pdf.addPage([300, 400]);
  return Buffer.from(await pdf.save());
}

const samplePng = () => sharp({ create: { width: 600, height: 800, channels: 3, background: "#f5ecdf" } }).png().toBuffer();

let categoryId: string;
beforeEach(async () => {
  await seedRoles();
  categoryId = (await db.category.create({ data: { slug: "productivity", name: "Productivity" } })).id;
});

async function completeDraft(title = "Deep Work Field Guide") {
  const product = await createProduct({ type: "guide", title });
  await updateProductSection(product.id, {
    section: "details",
    data: { title, slug: product.slug, shortDescription: "Focus for knowledge workers.", description: "A practical field guide to deep, focused work: rituals, environment, and weekly planning." },
  });
  await updateProductSection(product.id, { section: "pricing", data: { inr: "399", usd: "5.99" } });
  await updateProductSection(product.id, { section: "categories", data: { primaryCategoryId: categoryId, categoryIds: [] } });
  return product;
}

describe("admin product publishing", () => {
  it("blocks incomplete products, then publishes to the catalogue with an audit trail", async () => {
    const adminId = await signInAdmin("asha@example.com", "super_admin");
    const product = await completeDraft();

    await expect(publishProduct(product.id)).rejects.toMatchObject({ code: "PRODUCT_INCOMPLETE", meta: { missing: ["file", "previews"] } });

    await uploadVersion(product.id, await samplePdf(), { version: "1.0", changelog: "Initial release.", fileName: "anything.pdf" });
    await uploadPreview(product.id, await samplePng(), "Sample pages");
    expect((await listCatalog({ currency: "INR" })).items.map((p) => p.slug)).not.toContain(product.slug);

    await publishProduct(product.id);
    const { product: live, checks } = await getProductForEdit(product.id);
    expect(live.status).toBe("published");
    expect(live.currentVersionId).toBe(live.versions[0]!.id);
    expect(live.versions[0]).toMatchObject({ status: "published", pageCount: 3 });
    expect(live.previews[0]).toMatchObject({ watermarkApplied: true });
    expect(checks.filter((c) => c.required && !c.ok)).toEqual([]);

    const catalog = await listCatalog({ currency: "INR" });
    expect(catalog.items.find((p) => p.slug === product.slug)).toMatchObject({ title: "Deep Work Field Guide" });

    const actions = (await db.auditLog.findMany({ where: { entityId: product.id }, orderBy: { createdAt: "asc" } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["product.create", "product.update.pricing", "product.version.upload", "product.preview.add", "product.publish"]));
    expect(await db.auditLog.count({ where: { actorUserId: { not: adminId } } })).toBe(0);
  });

  it("rejects disguised files and keeps live products complete", async () => {
    await signInAdmin("asha@example.com", "super_admin");
    const product = await completeDraft();
    await expect(uploadVersion(product.id, Buffer.from("<html>not a pdf</html>"), { version: "1.0", fileName: "book.pdf" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(uploadPreview(product.id, await samplePdf(), null)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await uploadVersion(product.id, await samplePdf(), { version: "1.0", fileName: "a.pdf" });
    await uploadPreview(product.id, await samplePng(), null);
    await publishProduct(product.id);

    await expect(updateProductSection(product.id, { section: "pricing", data: { inr: "0", usd: "5.99" } })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(updateProductSection(product.id, { section: "details", data: { title: "Deep Work Field Guide", slug: product.slug, shortDescription: "", description: "short" } })).rejects.toMatchObject({ code: "PRODUCT_INCOMPLETE" });
    const after = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.description).toContain("practical field guide");
  });

  it("releases a new version and supersedes the old one", async () => {
    await signInAdmin("asha@example.com", "super_admin");
    const product = await completeDraft();
    await uploadVersion(product.id, await samplePdf(2), { version: "1.0", fileName: "a.pdf" });
    await uploadPreview(product.id, await samplePng(), null);
    await publishProduct(product.id);
    const v2 = await uploadVersion(product.id, await samplePdf(4), { version: "1.1", changelog: "New chapter.", fileName: "b.pdf" });
    await expect(uploadVersion(product.id, await samplePdf(), { version: "1.0", fileName: "c.pdf" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await publishVersion(product.id, v2.id);
    const versions = await db.productVersion.findMany({ where: { productId: product.id }, orderBy: { createdAt: "asc" } });
    expect(versions.map((v) => [v.version, v.status])).toEqual([
      ["1.0", "superseded"],
      ["1.1", "published"],
    ]);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).currentVersionId).toBe(v2.id);
  });
});

describe("admin permissions", () => {
  it("lets a support admin read but not edit the catalogue, and logs the denial", async () => {
    await signInAdmin("owner@example.com", "super_admin");
    const product = await createProduct({ type: "book", title: "Locked Book" });
    const supportId = await signInAdmin("support@example.com", "support");
    await expect(updateProductSection(product.id, { section: "seo", data: { seoTitle: "x" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(publishProduct(product.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCoupon({ code: "SAVE10", type: "percent", value: "10" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.securityEvent.count({ where: { type: "permission_denied", userId: supportId } })).toBe(3);
  });
});

describe("admin operations", () => {
  it("blocks a customer, revokes their sessions, and refuses to touch admins", async () => {
    cookieJar.clear();
    const { userId: customerId } = await register({ name: "Ravi Reader", email: "ravi@example.com", password: "readmore42" }, ctx);
    const adminId = await signInAdmin("asha@example.com", "super_admin");

    await expect(blockCustomer(customerId, " ")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await blockCustomer(customerId, "Chargeback abuse");
    expect((await db.user.findUniqueOrThrow({ where: { id: customerId } })).status).toBe("blocked");
    expect(await db.session.count({ where: { userId: customerId, revokedAt: null } })).toBe(0);
    await unblockCustomer(customerId);
    expect((await db.user.findUniqueOrThrow({ where: { id: customerId } })).status).toBe("active");

    await expect(blockCustomer(adminId, "nope")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.auditLog.count({ where: { action: { in: ["customer.block", "customer.unblock"] }, entityId: customerId } })).toBe(2);
  });

  it("validates coupons and keeps codes unique", async () => {
    await signInAdmin("asha@example.com", "super_admin");
    await expect(createCoupon({ code: "BIG", type: "percent", value: "150" })).rejects.toMatchObject({ fields: { value: expect.any(String) } });
    await expect(createCoupon({ code: "FLAT", type: "fixed", value: "100" })).rejects.toMatchObject({ fields: { currency: expect.any(String) } });
    const coupon = await createCoupon({ code: "welcome10", type: "percent", value: "10", perCustomerLimit: "1" });
    expect(coupon).toMatchObject({ code: "WELCOME10", value: 10, perCustomerLimit: 1, appliesTo: { scope: "all" } });
    await expect(createCoupon({ code: "WELCOME10", type: "percent", value: "5" })).rejects.toMatchObject({ fields: { code: expect.any(String) } });
  });

  it("moderates reviews and recomputes the rating from approved reviews only", async () => {
    cookieJar.clear();
    const { userId: readerId } = await register({ name: "Ravi Reader", email: "ravi@example.com", password: "readmore42" }, ctx);
    await signInAdmin("asha@example.com", "super_admin");
    const product = await db.product.create({ data: { slug: "rated", title: "Rated", type: "book", status: "published", publishedAt: new Date() } });
    const review = await db.review.create({ data: { userId: readerId, productId: product.id, rating: 4, body: "Clear and practical.", isVerifiedPurchase: true } });

    await expect(moderateReview(review.id, false, "")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await moderateReview(review.id, true, null);
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ ratingCount: 1 });
    await moderateReview(review.id, false, "Contains a spoiler");
    expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({ ratingCount: 0, ratingAvg: null });
  });
});
