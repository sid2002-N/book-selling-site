import "server-only";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { ProductStatus, ProductType } from "@/generated/prisma/enums";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit, requirePermission } from "@/modules/admin";
import { newObjectKey, storage } from "@/modules/storage";
import { checkUpload, parseInsideLines, parseMajorToMinor, parseTocLines } from "./files";
import { missingRequired, readinessChecks, slugify, type ReadinessCheck } from "./readiness";

export const PRODUCT_TYPES = ["book", "guide", "workbook", "bundle", "free_resource"] as const;
export const PRODUCT_STATUSES = ["draft", "in_review", "published", "unpublished", "archived"] as const;
const PAGE_SIZE = 20;

// ───────────────────────────── Reads ─────────────────────────────

export async function listProducts(params: { q?: string; status?: string; type?: string; page?: number }) {
  await requirePermission("products.read");
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (params.status && (PRODUCT_STATUSES as readonly string[]).includes(params.status)) where.status = params.status as ProductStatus;
  else where.status = { not: "archived" };
  if (params.type && (PRODUCT_TYPES as readonly string[]).includes(params.type)) where.type = params.type as ProductType;
  if (params.q?.trim()) where.OR = [{ title: { contains: params.q.trim(), mode: "insensitive" } }, { slug: { contains: params.q.trim().toLowerCase() } }];
  const page = Math.max(1, params.page ?? 1);
  const [rows, total, counts] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        spineColor: true,
        updatedAt: true,
        publishedAt: true,
        cover: { select: { storageKey: true } },
        primaryCategory: { select: { name: true } },
        prices: { where: { startsAt: null }, select: { currency: true, amountMinor: true } },
        _count: { select: { orderItems: { where: { order: { status: { in: ["paid", "partially_refunded"] } } } } } },
      },
    }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<ProductStatus, number>>;
  return {
    rows: rows.map((r) => ({ ...r, coverUrl: r.cover ? storage().publicUrl(r.cover.storageKey) : null, sales: r._count.orderItems })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    byStatus,
  };
}

const editorInclude = {
  cover: true,
  prices: { orderBy: { currency: "asc" } },
  categories: { select: { categoryId: true } },
  tags: { select: { tag: { select: { name: true } } } },
  authors: { orderBy: { position: "asc" }, select: { author: { select: { id: true, name: true } } } },
  tocEntries: { orderBy: { position: "asc" } },
  insideItems: { orderBy: { position: "asc" } },
  faqs: { orderBy: { position: "asc" } },
  previews: { orderBy: { position: "asc" }, include: { asset: true } },
  versions: { orderBy: { createdAt: "desc" }, include: { files: true, _count: { select: { libraryItems: true } } } },
  bundleItems: { orderBy: { position: "asc" }, select: { productId: true, product: { select: { title: true, status: true } } } },
  _count: { select: { orderItems: true, libraryItems: true, reviews: true } },
} satisfies Prisma.ProductInclude;

export type EditorProduct = Prisma.ProductGetPayload<{ include: typeof editorInclude }>;

/** The version that would be delivered: the current one, or the newest draft before first publish. */
function deliverableVersion(p: Pick<EditorProduct, "currentVersionId" | "versions">) {
  return p.versions.find((v) => v.id === p.currentVersionId) ?? p.versions.find((v) => v.status === "draft") ?? null;
}

export function productReadiness(p: EditorProduct): ReadinessCheck[] {
  return readinessChecks({
    type: p.type,
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    primaryCategoryId: p.primaryCategoryId,
    prices: p.prices.filter((x) => !x.startsAt && !x.endsAt),
    deliverableFileCount: deliverableVersion(p)?.files.length ?? 0,
    previewCount: p.previews.length,
    bundleItemCount: p.bundleItems.length,
    hasCover: Boolean(p.coverAssetId),
    tocCount: p.tocEntries.length,
    faqCount: p.faqs.length,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  });
}

async function loadEditorProduct(id: string, client: Tx | typeof db = db): Promise<EditorProduct> {
  const product = await client.product.findFirst({ where: { id, deletedAt: null }, include: editorInclude });
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", "That product doesn't exist.");
  return product;
}

export async function getProductForEdit(id: string) {
  await requirePermission("products.read");
  const product = await loadEditorProduct(id);
  const [categories, authors, bundleCandidates, sales] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } }),
    db.author.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    product.type === "bundle"
      ? db.product.findMany({ where: { deletedAt: null, type: { not: "bundle" }, status: { not: "archived" } }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true } })
      : Promise.resolve([]),
    db.orderItem.aggregate({ where: { productId: id, order: { status: { in: ["paid", "partially_refunded"] } } }, _count: { _all: true } }),
  ]);
  return {
    product,
    coverUrl: product.cover ? storage().publicUrl(product.cover.storageKey) : null,
    previews: product.previews.map((p) => ({ id: p.id, label: p.label, kind: p.kind, url: storage().publicUrl(p.asset.storageKey) })),
    checks: productReadiness(product),
    categories,
    authors,
    bundleCandidates,
    sales: sales._count._all,
  };
}

// ───────────────────────────── Mutations ─────────────────────────────

function snapshot(p: EditorProduct) {
  return {
    title: p.title,
    slug: p.slug,
    status: p.status,
    type: p.type,
    prices: p.prices.map((x) => ({ currency: x.currency, amountMinor: x.amountMinor, compareAtMinor: x.compareAtMinor })),
    primaryCategoryId: p.primaryCategoryId,
  };
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = base || "untitled";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === exceptId) return candidate;
  }
  throw new AppError("SLUG_TAKEN", "Couldn't find a free URL slug — please choose one.");
}

export const createProductInput = z.object({
  type: z.enum(PRODUCT_TYPES),
  title: z.string().trim().min(2, { error: "Give the product a title." }).max(160),
});

export async function createProduct(input: z.infer<typeof createProductInput>) {
  const ctx = await requirePermission("products.create");
  const data = createProductInput.parse(input);
  const slug = await uniqueSlug(slugify(data.title));
  const product = await db.product.create({ data: { type: data.type, title: data.title, slug, status: "draft" } });
  await audit({ actorUserId: ctx.user.id, action: "product.create", entityType: "product", entityId: product.id, after: { title: product.title, type: product.type, slug } });
  return product;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s ? s : null))
    .nullish();

export const detailsInput = z.object({
  title: z.string().trim().min(2, { error: "Give the product a title." }).max(160),
  subtitle: optionalText(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use lowercase letters, numbers and hyphens." })
    .max(80),
  shortDescription: optionalText(280),
  description: optionalText(8000),
});

export const metadataInput = z.object({
  publisher: optionalText(120),
  language: z.string().trim().min(2).max(12).default("en"),
  level: optionalText(40),
  spineColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Use a hex colour like #2F4A3A." }),
  authorId: z.uuid().nullish().or(z.literal("").transform(() => null)),
  tags: z.string().max(400).default(""),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
});

export const seoInput = z.object({ seoTitle: optionalText(70), seoDescription: optionalText(170) });

export const pricingInput = z.object({
  inr: z.string(),
  inrCompare: z.string().optional(),
  usd: z.string(),
  usdCompare: z.string().optional(),
});

export const categoriesInput = z.object({
  primaryCategoryId: z.uuid({ error: "Choose a primary category." }),
  categoryIds: z.array(z.uuid()).max(12).default([]),
});

export const contentInput = z.object({
  toc: z.string().max(20_000).default(""),
  inside: z.string().max(8_000).default(""),
  faqs: z
    .array(z.object({ question: z.string().trim().max(200), answer: z.string().trim().max(1200) }))
    .max(20)
    .default([]),
  bundleProductIds: z.array(z.uuid()).max(30).optional(),
});

export type ProductSection =
  | { section: "details"; data: z.input<typeof detailsInput> }
  | { section: "metadata"; data: z.input<typeof metadataInput> }
  | { section: "seo"; data: z.input<typeof seoInput> }
  | { section: "pricing"; data: z.input<typeof pricingInput> }
  | { section: "categories"; data: z.input<typeof categoriesInput> }
  | { section: "content"; data: z.input<typeof contentInput> };

function moneyField(raw: string | undefined, field: string, required: boolean): number | null {
  const v = parseMajorToMinor(raw);
  if (v === "invalid") throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields.", { fields: { [field]: "Enter an amount like 499 or 9.99." } });
  if (v === null && required) throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields.", { fields: { [field]: "Enter a price." } });
  return v;
}

/** Saves one editor section. Every save is permission-checked and audit-logged. */
export async function updateProductSection(productId: string, input: ProductSection) {
  const ctx = await requirePermission("products.update");
  const before = await loadEditorProduct(productId);
  if (before.status === "archived") throw new AppError("INVALID_REQUEST", "Restore this product before editing it.");

  await db.$transaction(async (tx) => {
    switch (input.section) {
      case "details": {
        const d = detailsInput.parse(input.data);
        const clash = await tx.product.findUnique({ where: { slug: d.slug }, select: { id: true } });
        if (clash && clash.id !== productId) throw new AppError("SLUG_TAKEN", "That URL slug is already used.", { fields: { slug: "That slug is already used by another product." } });
        await tx.product.update({ where: { id: productId }, data: d });
        break;
      }
      case "metadata": {
        const d = metadataInput.parse(input.data);
        await tx.product.update({
          where: { id: productId },
          data: { publisher: d.publisher, language: d.language, level: d.level, spineColor: d.spineColor.toUpperCase(), isFeatured: d.isFeatured, isBestseller: d.isBestseller },
        });
        await tx.productAuthor.deleteMany({ where: { productId } });
        if (d.authorId) await tx.productAuthor.create({ data: { productId, authorId: d.authorId, role: "author" } });
        const names = [...new Set(d.tags.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12);
        await tx.productTag.deleteMany({ where: { productId } });
        for (const name of names) {
          const slug = slugify(name);
          if (!slug) continue;
          const tag = await tx.tag.upsert({ where: { slug }, create: { slug, name: name.slice(0, 40) }, update: {} });
          await tx.productTag.create({ data: { productId, tagId: tag.id } });
        }
        break;
      }
      case "seo": {
        await tx.product.update({ where: { id: productId }, data: seoInput.parse(input.data) });
        break;
      }
      case "pricing": {
        const d = pricingInput.parse(input.data);
        const free = before.type === "free_resource";
        const rows = [
          { currency: "INR" as const, amount: moneyField(d.inr, "inr", true)!, compare: moneyField(d.inrCompare, "inrCompare", false) },
          { currency: "USD" as const, amount: moneyField(d.usd, "usd", true)!, compare: moneyField(d.usdCompare, "usdCompare", false) },
        ];
        for (const r of rows) {
          const key = r.currency.toLowerCase();
          if (free && r.amount !== 0) throw new AppError("VALIDATION_ERROR", "Free resources must be priced at 0.", { fields: { [key]: "Free resources are priced at 0." } });
          if (!free && r.amount <= 0) throw new AppError("VALIDATION_ERROR", "Paid products need a price above 0.", { fields: { [key]: "Enter a price above 0." } });
          if (r.compare !== null && r.compare <= r.amount) throw new AppError("VALIDATION_ERROR", "Compare-at prices must be higher than the price.", { fields: { [`${key}Compare`]: "Must be higher than the price, or leave blank." } });
          const base = await tx.productPrice.findFirst({ where: { productId, currency: r.currency, startsAt: null, endsAt: null } });
          if (base) await tx.productPrice.update({ where: { id: base.id }, data: { amountMinor: r.amount, compareAtMinor: r.compare } });
          else await tx.productPrice.create({ data: { productId, currency: r.currency, amountMinor: r.amount, compareAtMinor: r.compare } });
        }
        break;
      }
      case "categories": {
        const d = categoriesInput.parse(input.data);
        const ids = [...new Set([d.primaryCategoryId, ...d.categoryIds])];
        const found = await tx.category.count({ where: { id: { in: ids } } });
        if (found !== ids.length) throw new AppError("VALIDATION_ERROR", "One of those categories no longer exists.");
        await tx.product.update({ where: { id: productId }, data: { primaryCategoryId: d.primaryCategoryId } });
        await tx.productCategory.deleteMany({ where: { productId } });
        await tx.productCategory.createMany({ data: ids.map((categoryId) => ({ productId, categoryId })) });
        break;
      }
      case "content": {
        const d = contentInput.parse(input.data);
        await tx.tocEntry.deleteMany({ where: { productId } });
        await tx.tocEntry.createMany({ data: parseTocLines(d.toc).map((r, position) => ({ productId, position, ...r })) });
        await tx.productInsideItem.deleteMany({ where: { productId } });
        await tx.productInsideItem.createMany({ data: parseInsideLines(d.inside).map((r, position) => ({ productId, position, ...r })) });
        await tx.productFaq.deleteMany({ where: { productId } });
        const faqs = d.faqs.filter((f) => f.question && f.answer);
        await tx.productFaq.createMany({ data: faqs.map((f, position) => ({ productId, position, ...f })) });
        if (before.type === "bundle" && d.bundleProductIds) {
          const ids = [...new Set(d.bundleProductIds)].filter((id) => id !== productId);
          const valid = await tx.product.count({ where: { id: { in: ids }, type: { not: "bundle" }, deletedAt: null } });
          if (valid !== ids.length) throw new AppError("VALIDATION_ERROR", "Bundles can only contain single, existing products.");
          await tx.bundleItem.deleteMany({ where: { bundleProductId: productId } });
          await tx.bundleItem.createMany({ data: ids.map((id, position) => ({ bundleProductId: productId, productId: id, position })) });
        }
        break;
      }
    }
    // A published product must stay complete: an edit that breaks a required check rolls back.
    if (before.status === "published") {
      const missing = missingRequired(productReadiness(await loadEditorProduct(productId, tx)));
      if (missing.length) {
        throw new AppError("PRODUCT_INCOMPLETE", `A published product needs: ${missing.map((m) => m.label.toLowerCase()).join(", ")}. Unpublish it first to make that change.`);
      }
    }
  });

  const after = await loadEditorProduct(productId);
  await audit({ actorUserId: ctx.user.id, action: `product.update.${input.section}`, entityType: "product", entityId: productId, before: snapshot(before), after: snapshot(after) });
  return after;
}

// ───────────────────────────── Lifecycle ─────────────────────────────

export async function publishProduct(productId: string) {
  const ctx = await requirePermission("products.publish");
  const product = await loadEditorProduct(productId);
  if (product.status === "archived") throw new AppError("INVALID_REQUEST", "Restore this product before publishing it.");
  const missing = missingRequired(productReadiness(product));
  if (missing.length) {
    throw new AppError("PRODUCT_INCOMPLETE", "This product isn't ready to publish yet.", { meta: { missing: missing.map((m) => m.key) } });
  }
  const now = new Date();
  await db.$transaction(async (tx) => {
    if (product.type !== "bundle" && !product.currentVersionId) {
      const draft = deliverableVersion(product)!;
      await tx.productVersion.update({ where: { id: draft.id }, data: { status: "published", releasedAt: now } });
      await tx.product.update({ where: { id: productId }, data: { currentVersionId: draft.id } });
    }
    await tx.product.update({ where: { id: productId }, data: { status: "published", publishedAt: product.publishedAt ?? now } });
    await audit({ actorUserId: ctx.user.id, action: "product.publish", entityType: "product", entityId: productId, before: { status: product.status }, after: { status: "published" } }, tx);
  });
}

export async function unpublishProduct(productId: string) {
  const ctx = await requirePermission("products.publish");
  const product = await loadEditorProduct(productId);
  if (product.status !== "published") throw new AppError("INVALID_REQUEST", "Only published products can be unpublished.");
  await db.product.update({ where: { id: productId }, data: { status: "unpublished" } });
  await audit({ actorUserId: ctx.user.id, action: "product.unpublish", entityType: "product", entityId: productId, before: { status: product.status }, after: { status: "unpublished" } });
}

/** Archive hides the product from the store. Buyers keep access to what they own. */
export async function archiveProduct(productId: string) {
  const ctx = await requirePermission("products.delete");
  const product = await loadEditorProduct(productId);
  if (product.status === "archived") return;
  await db.product.update({ where: { id: productId }, data: { status: "archived" } });
  await audit({ actorUserId: ctx.user.id, action: "product.archive", entityType: "product", entityId: productId, before: { status: product.status }, after: { status: "archived" } });
}

export async function restoreProduct(productId: string) {
  const ctx = await requirePermission("products.delete");
  const product = await loadEditorProduct(productId);
  if (product.status !== "archived") throw new AppError("INVALID_REQUEST", "Only archived products can be restored.");
  await db.product.update({ where: { id: productId }, data: { status: "draft" } });
  await audit({ actorUserId: ctx.user.id, action: "product.restore", entityType: "product", entityId: productId, before: { status: "archived" }, after: { status: "draft" } });
}

// ───────────────────────────── Files ─────────────────────────────

const WATERMARK = (w: number, h: number) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <g transform="translate(${w / 2} ${h / 2}) rotate(-30)" opacity="0.18">
      <text text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(w / 11)}" fill="#6B2A3A">KRM.lib · Preview</text>
    </g>
    <text x="${w / 2}" y="${h - Math.round(h / 40)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w / 45)}" fill="#8C7767">Preview — sample page</text>
  </svg>`);

export async function uploadCover(productId: string, bytes: Buffer, alt: string | null) {
  const ctx = await requirePermission("products.update");
  const product = await loadEditorProduct(productId);
  const verdict = checkUpload("cover", bytes);
  if (!verdict.ok) throw new AppError("VALIDATION_ERROR", verdict.reason);
  const image = sharp(bytes, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1200, height: 1800, fit: "inside", withoutEnlargement: true });
  const out = await image.webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const key = newObjectKey("covers", "webp");
  await storage().put("public", key, out.data, "image/webp");
  const asset = await db.asset.create({
    data: { kind: "image", bucket: "public", storageKey: key, mime: "image/webp", width: out.info.width, height: out.info.height, sizeBytes: out.data.length, alt: alt?.slice(0, 200) || `Cover of ${product.title}`, createdById: ctx.user.id },
  });
  await db.product.update({ where: { id: productId }, data: { coverAssetId: asset.id } });
  await audit({ actorUserId: ctx.user.id, action: "product.cover.upload", entityType: "product", entityId: productId, before: { coverAssetId: product.coverAssetId }, after: { coverAssetId: asset.id } });
}

export async function removeCover(productId: string) {
  const ctx = await requirePermission("products.update");
  const product = await loadEditorProduct(productId);
  if (!product.coverAssetId) return;
  await db.product.update({ where: { id: productId }, data: { coverAssetId: null } });
  await audit({ actorUserId: ctx.user.id, action: "product.cover.remove", entityType: "product", entityId: productId, before: { coverAssetId: product.coverAssetId }, after: { coverAssetId: null } });
}

/** Preview pages are re-encoded and stamped with a visible watermark before they are public. */
export async function uploadPreview(productId: string, bytes: Buffer, label: string | null) {
  const ctx = await requirePermission("products.update");
  const product = await loadEditorProduct(productId);
  if (product.previews.length >= 8) throw new AppError("INVALID_REQUEST", "A product can have up to 8 preview pages.");
  const verdict = checkUpload("preview", bytes);
  if (!verdict.ok) throw new AppError("VALIDATION_ERROR", verdict.reason);
  const base = await sharp(bytes, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 900, height: 1400, fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const { width, height } = base.info;
  const stamped = await sharp(base.data).composite([{ input: WATERMARK(width, height), top: 0, left: 0 }]).webp({ quality: 80 }).toBuffer();
  const key = newObjectKey("previews", "webp");
  await storage().put("public", key, stamped, "image/webp");
  const position = product.previews.length;
  const kind = position === 0 ? "sample_page" : position === 1 ? "chapter_example" : "checklist_example";
  const asset = await db.asset.create({
    data: { kind: "image", bucket: "public", storageKey: key, mime: "image/webp", width, height, sizeBytes: stamped.length, alt: `${label || "Preview page"} from ${product.title}`, createdById: ctx.user.id },
  });
  const preview = await db.productPreview.create({
    data: { productId, kind, label: label?.slice(0, 60) || `Preview ${position + 1}`, assetId: asset.id, position, watermarkApplied: true },
  });
  await audit({ actorUserId: ctx.user.id, action: "product.preview.add", entityType: "product", entityId: productId, after: { previewId: preview.id } });
}

export async function deletePreview(productId: string, previewId: string) {
  const ctx = await requirePermission("products.update");
  const product = await loadEditorProduct(productId);
  const preview = product.previews.find((p) => p.id === previewId);
  if (!preview) throw new AppError("NOT_FOUND", "That preview no longer exists.");
  if (product.status === "published" && product.previews.length <= 1) {
    throw new AppError("PRODUCT_INCOMPLETE", "A published product needs at least one preview page. Add another before removing this one.");
  }
  await db.$transaction(async (tx) => {
    await tx.productPreview.delete({ where: { id: previewId } });
    const rest = product.previews.filter((p) => p.id !== previewId);
    for (const [position, p] of rest.entries()) await tx.productPreview.update({ where: { id: p.id }, data: { position } });
    await audit({ actorUserId: ctx.user.id, action: "product.preview.remove", entityType: "product", entityId: productId, before: { previewId } }, tx);
  });
}

export const versionInput = z.object({
  version: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,3}){0,2}$/, { error: "Use a version like 1.0 or 1.2.1." }),
  changelog: z.string().trim().max(1000).optional(),
});

/**
 * Uploads a deliverable as a new draft version. Customers keep their version until the admin
 * publishes this one; then owners see "Update available" (UX Flow 16).
 */
export async function uploadVersion(productId: string, bytes: Buffer, meta: { version: string; changelog?: string; fileName: string }) {
  const ctx = await requirePermission("products.update");
  const product = await loadEditorProduct(productId);
  if (product.type === "bundle") throw new AppError("INVALID_REQUEST", "Bundles deliver their products' files — upload files on each product instead.");
  const { version, changelog } = versionInput.parse(meta);
  if (product.versions.some((v) => v.version === version)) throw new AppError("VALIDATION_ERROR", "That version number is already used.", { fields: { version: "Already used — pick the next number." } });
  const verdict = checkUpload("deliverable", bytes);
  if (!verdict.ok) throw new AppError("VALIDATION_ERROR", verdict.reason);

  let pageCount: number | null = null;
  if (verdict.type === "pdf") {
    try {
      pageCount = (await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount();
    } catch {
      throw new AppError("VALIDATION_ERROR", "That PDF couldn't be read. Password-protected or damaged PDFs aren't supported.");
    }
  }
  const ext = verdict.type === "pdf" ? "pdf" : "zip";
  const key = newObjectKey("products", ext);
  await storage().put("private", key, bytes, verdict.type === "pdf" ? "application/pdf" : "application/zip");
  const safeName = `${product.slug}-v${version}.${ext}`;
  const created = await db.$transaction(async (tx) => {
    // Only one unreleased draft at a time keeps "what will customers get" unambiguous.
    const drafts = product.versions.filter((v) => v.status === "draft");
    for (const d of drafts) {
      await tx.productFile.deleteMany({ where: { productVersionId: d.id } });
      await tx.productVersion.delete({ where: { id: d.id } });
    }
    const v = await tx.productVersion.create({
      data: {
        productId,
        version,
        changelog: changelog || null,
        status: "draft",
        pageCount,
        files: {
          create: {
            kind: verdict.type === "zip" ? "zip" : product.type === "workbook" ? "fillable_pdf" : "pdf",
            storageKey: key,
            fileName: safeName,
            sizeBytes: bytes.length,
            checksumSha256: createHash("sha256").update(bytes).digest("hex"),
            mime: verdict.type === "pdf" ? "application/pdf" : "application/zip",
            pageCount,
          },
        },
      },
    });
    await audit({ actorUserId: ctx.user.id, action: "product.version.upload", entityType: "product", entityId: productId, after: { versionId: v.id, version, sizeBytes: bytes.length, replacedDrafts: drafts.map((d) => d.version) } }, tx);
    return v;
  });
  return created;
}

/** Releases a draft version to customers: it becomes current and the old one is superseded. */
export async function publishVersion(productId: string, versionId: string) {
  const ctx = await requirePermission("products.publish");
  const product = await loadEditorProduct(productId);
  const version = product.versions.find((v) => v.id === versionId);
  if (!version || version.status !== "draft") throw new AppError("INVALID_REQUEST", "Only a draft version can be released.");
  if (!version.files.length) throw new AppError("PRODUCT_INCOMPLETE", "This version has no file.");
  await db.$transaction(async (tx) => {
    if (product.currentVersionId) await tx.productVersion.update({ where: { id: product.currentVersionId }, data: { status: "superseded" } });
    await tx.productVersion.update({ where: { id: versionId }, data: { status: "published", releasedAt: new Date() } });
    await tx.product.update({ where: { id: productId }, data: { currentVersionId: versionId } });
    await audit({ actorUserId: ctx.user.id, action: "product.version.publish", entityType: "product", entityId: productId, before: { currentVersionId: product.currentVersionId }, after: { currentVersionId: versionId, version: version.version } }, tx);
  });
}

export async function discardDraftVersion(productId: string, versionId: string) {
  const ctx = await requirePermission("products.update");
  const product = await loadEditorProduct(productId);
  const version = product.versions.find((v) => v.id === versionId);
  if (!version || version.status !== "draft") throw new AppError("INVALID_REQUEST", "Only a draft version can be discarded.");
  if (product.status === "published" && !product.currentVersionId) throw new AppError("INVALID_REQUEST", "This is the only file of a published product.");
  await db.$transaction(async (tx) => {
    await tx.productFile.deleteMany({ where: { productVersionId: versionId } });
    await tx.productVersion.delete({ where: { id: versionId } });
    await audit({ actorUserId: ctx.user.id, action: "product.version.discard", entityType: "product", entityId: productId, before: { versionId, version: version.version } }, tx);
  });
}

