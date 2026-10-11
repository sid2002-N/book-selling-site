import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { DEMO_BUNDLES, DEMO_CATEGORIES, DEMO_COLLECTIONS, DEMO_PRODUCTS, PRODUCT_FAQS, type DemoProduct } from "./catalog-data";

const STORAGE_ROOT = path.resolve(process.cwd(), ".storage");
const DAY = 86_400_000;

async function writeObject(bucket: "public" | "private", key: string, body: Buffer) {
  const file = path.join(STORAGE_ROOT, bucket, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

const objectKey = (prefix: string, ext: string) => `${prefix}/${randomBytes(16).toString("hex")}.${ext}`;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** A small, clearly-labelled demo PDF so downloads and the reader work end to end. */
async function demoPdf(product: { title: string; subtitle: string; spine: string; chapters: string[] }): Promise<{ bytes: Buffer; pages: number }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(product.title);
  pdf.setAuthor("KRM.lib");
  pdf.setSubject("Demo edition");
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.165, 0.114, 0.086);
  const muted = rgb(0.37, 0.29, 0.24);

  const wrap = (text: string, font: typeof serif, size: number, width: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };

  // Cover
  const cover = pdf.addPage([432, 648]);
  cover.drawRectangle({ x: 0, y: 0, width: 432, height: 648, color: hexToRgb(product.spine) });
  cover.drawRectangle({ x: 18, y: 18, width: 396, height: 612, borderColor: rgb(1, 1, 1), borderWidth: 0.6, opacity: 0 });
  let y = 420;
  for (const line of wrap(product.title, serifBold, 34, 340)) {
    cover.drawText(line, { x: 46, y, size: 34, font: serifBold, color: rgb(0.97, 0.93, 0.87) });
    y -= 40;
  }
  cover.drawText("DEMO EDITION", { x: 46, y: 560, size: 10, font: sans, color: rgb(0.97, 0.93, 0.87) });
  cover.drawText("KRM.lib", { x: 46, y: 50, size: 16, font: serif, color: rgb(0.97, 0.93, 0.87) });

  // Notice + contents
  const toc = pdf.addPage([432, 648]);
  toc.drawText("Contents", { x: 46, y: 570, size: 26, font: serifBold, color: ink });
  product.chapters.forEach((c, i) => {
    toc.drawText(`${i + 1}.  ${c}`, { x: 46, y: 520 - i * 24, size: 13, font: serif, color: ink });
    toc.drawText(String(i + 3), { x: 370, y: 520 - i * 24, size: 13, font: serif, color: muted });
  });
  const notice = wrap(
    "This is a demo edition generated for development. It exists to test purchasing, downloads, versions and the reader; it is not real course content.",
    sans,
    9,
    340,
  );
  notice.forEach((l, i) => toc.drawText(l, { x: 46, y: 90 - i * 12, size: 9, font: sans, color: muted }));

  // One page per chapter
  product.chapters.forEach((chapter, i) => {
    const page = pdf.addPage([432, 648]);
    page.drawText(`Chapter ${i + 1}`, { x: 46, y: 580, size: 11, font: sans, color: muted });
    let cy = 550;
    for (const line of wrap(chapter, serifBold, 24, 340)) {
      page.drawText(line, { x: 46, y: cy, size: 24, font: serifBold, color: ink });
      cy -= 30;
    }
    const body = wrap(
      `In the full edition, this chapter of ${product.title} covers ${chapter.toLowerCase()} in practical detail, with examples and exercises. In this demo edition the page is a placeholder so you can test navigation, zoom, bookmarks and reading progress.`,
      serif,
      12,
      340,
    );
    body.forEach((l, j) => page.drawText(l, { x: 46, y: cy - 20 - j * 17, size: 12, font: serif, color: ink }));
    page.drawText(String(i + 3), { x: 210, y: 30, size: 10, font: serif, color: muted });
  });

  const bytes = Buffer.from(await pdf.save());
  return { bytes, pages: pdf.getPageCount() };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Pre-rendered, watermarked preview page image (SECURITY §7): never the paid file itself. */
async function previewImage(title: string, heading: string, kicker: string, lines: number): Promise<Buffer> {
  const textLines = Array.from({ length: lines }, (_, i) => {
    const w = 640 - ((i * 37) % 160);
    return `<rect x="120" y="${470 + i * 34}" width="${w}" height="10" rx="5" fill="#C9B79F" opacity="0.6"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#FFFDF8"/>
    <text x="120" y="250" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#8C7767">${esc(kicker)}</text>
    <text x="120" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="56" fill="#2A1D16">${esc(heading.slice(0, 26))}</text>
    <text x="120" y="400" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="#5E4A3C">${esc(title.slice(0, 44))}</text>
    ${textLines}
    <g transform="translate(450 650) rotate(-30)" opacity="0.16">
      <text text-anchor="middle" font-family="Georgia, serif" font-size="78" fill="#6B2A3A">KRM.lib · Preview</text>
    </g>
    <text x="450" y="1150" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#8C7767">Preview — sample page</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

async function upsertCategories(db: PrismaClient) {
  const map = new Map<string, string>();
  for (const [i, c] of DEMO_CATEGORIES.entries()) {
    const rec = await db.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, icon: c.icon, position: i },
      update: { name: c.name, description: c.description, icon: c.icon, position: i },
    });
    map.set(c.slug, rec.id);
  }
  return map;
}

async function createProduct(
  db: PrismaClient,
  p: DemoProduct,
  categoryIds: Map<string, string>,
  authorId: string,
  licenseId: string | null,
  tagIds: Map<string, string>,
) {
  const publishedAt = new Date(Date.now() - p.daysAgo * DAY);
  const product = await db.product.create({
    data: {
      slug: p.slug,
      type: p.type,
      title: p.title,
      subtitle: p.subtitle,
      shortDescription: p.subtitle,
      description: `${p.subtitle}\n\nThis is DEMO catalogue content for development. In a real listing this section would describe who the product is for, what problems it solves and how it is structured.`,
      spineColor: p.spine,
      status: "published",
      publishedAt,
      primaryCategoryId: categoryIds.get(p.category),
      publisher: "KRM.lib",
      language: "en",
      level: p.level,
      licenseId,
      isFeatured: Boolean(p.featured),
      seoTitle: `${p.title} — ${p.type === "free_resource" ? "Free resource" : "Digital " + p.type}`,
      seoDescription: p.subtitle,
      categories: {
        create: [p.category, ...(p.extraCategories ?? [])].map((slug) => ({ categoryId: categoryIds.get(slug)! })),
      },
      tags: { create: p.tags.map((t) => ({ tagId: tagIds.get(t)! })) },
      authors: { create: { authorId, role: "author" } },
      prices: {
        create: [
          { currency: "INR", amountMinor: p.inr, compareAtMinor: p.inrCompare ?? null },
          { currency: "USD", amountMinor: p.usd, compareAtMinor: p.usdCompare ?? null },
        ],
      },
      tocEntries: { create: p.chapters.map((title, i) => ({ position: i, title, pageNumber: i + 3 })) },
      insideItems: { create: p.inside.map((it, i) => ({ position: i, ...it })) },
      faqs: { create: PRODUCT_FAQS.map((f, i) => ({ position: i, ...f })) },
      createdAt: publishedAt,
    },
  });

  // Versions: optional older version so "update available" can be exercised.
  const versions = p.version && p.version !== "1.0" ? ["1.0", p.version] : ["1.0"];
  let currentVersionId = "";
  let pageCount = 0;
  for (const [i, version] of versions.entries()) {
    const isLatest = i === versions.length - 1;
    const { bytes, pages } = await demoPdf({ title: p.title, subtitle: p.subtitle, spine: p.spine, chapters: isLatest ? p.chapters : p.chapters.slice(0, -1) });
    const key = objectKey("products", "pdf");
    await writeObject("private", key, bytes);
    const v = await db.productVersion.create({
      data: {
        productId: product.id,
        version,
        status: isLatest ? "published" : "superseded",
        releasedAt: new Date(publishedAt.getTime() + i * 7 * DAY),
        changelog: isLatest && versions.length > 1 ? "Added a new chapter and refreshed examples." : "Initial release.",
        pageCount: pages,
        files: {
          create: {
            kind: p.type === "workbook" ? "fillable_pdf" : "pdf",
            storageKey: key,
            fileName: `${p.slug}-v${version}.pdf`,
            sizeBytes: bytes.length,
            checksumSha256: createHash("sha256").update(bytes).digest("hex"),
            mime: "application/pdf",
            pageCount: pages,
          },
        },
      },
    });
    if (isLatest) {
      currentVersionId = v.id;
      pageCount = pages;
    }
  }
  await db.product.update({ where: { id: product.id }, data: { currentVersionId } });

  // Watermarked previews.
  const previewSpecs = [
    { kind: "sample_page" as const, label: "Sample Pages", heading: p.chapters[0] ?? p.title, kicker: "Chapter 1" },
    { kind: "chapter_example" as const, label: "Chapter Example", heading: p.chapters[1] ?? p.title, kicker: "Chapter 2" },
    { kind: "checklist_example" as const, label: "Checklist Example", heading: "Checklist", kicker: "Practice" },
  ];
  for (const [i, spec] of previewSpecs.entries()) {
    const image = await previewImage(p.title, spec.heading, spec.kicker, 12 + i * 2);
    const key = objectKey("previews", "webp");
    await writeObject("public", key, image);
    const asset = await db.asset.create({
      data: { kind: "image", storageKey: key, bucket: "public", mime: "image/webp", width: 900, height: 1200, sizeBytes: image.length, alt: `${spec.label} from ${p.title}` },
    });
    await db.productPreview.create({
      data: { productId: product.id, kind: spec.kind, label: spec.label, pageNumber: i + 3, assetId: asset.id, position: i, watermarkApplied: true },
    });
  }
  return { id: product.id, pageCount };
}

export async function seedDemoCatalog(db: PrismaClient): Promise<void> {
  const existing = await db.product.count();
  if (existing > 0) {
    console.log(`seed:demo — catalogue already has ${existing} products; skipping catalogue seed (run db:reset to rebuild)`);
    return;
  }
  const categoryIds = await upsertCategories(db);
  const author = await db.author.upsert({
    where: { slug: "krm-editorial" },
    create: { slug: "krm-editorial", name: "KRM.lib Editorial", bio: "The KRM.lib editorial team (demo author)." },
    update: {},
  });
  const license = await db.license.findUnique({ where: { key: "personal" } });
  const allTags = [...new Set(DEMO_PRODUCTS.flatMap((p) => p.tags))];
  const tagIds = new Map<string, string>();
  for (const t of allTags) {
    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tag = await db.tag.upsert({ where: { slug }, create: { slug, name: t }, update: {} });
    tagIds.set(t, tag.id);
  }

  const productIds = new Map<string, string>();
  for (const p of DEMO_PRODUCTS) {
    const { id } = await createProduct(db, p, categoryIds, author.id, license?.id ?? null, tagIds);
    productIds.set(p.slug, id);
  }

  for (const b of DEMO_BUNDLES) {
    const publishedAt = new Date(Date.now() - b.daysAgo * DAY);
    const bundle = await db.product.create({
      data: {
        slug: b.slug,
        type: "bundle",
        title: b.title,
        subtitle: b.subtitle,
        shortDescription: b.subtitle,
        description: `${b.subtitle}\n\nDEMO bundle — the bundle price is lower than buying each product individually.`,
        spineColor: b.spine,
        status: "published",
        publishedAt,
        primaryCategoryId: categoryIds.get(b.category),
        publisher: "KRM.lib",
        isFeatured: true,
        categories: { create: { categoryId: categoryIds.get(b.category)! } },
        prices: { create: [{ currency: "INR", amountMinor: b.inr }, { currency: "USD", amountMinor: b.usd }] },
        bundleItems: { create: b.items.map((slug, i) => ({ productId: productIds.get(slug)!, position: i })) },
        faqs: { create: PRODUCT_FAQS.slice(0, 2).map((f, i) => ({ position: i, ...f })) },
        createdAt: publishedAt,
      },
    });
    productIds.set(b.slug, bundle.id);
  }

  for (const [i, c] of DEMO_COLLECTIONS.entries()) {
    await db.collection.create({
      data: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        status: "published",
        publishedAt: new Date(),
        categoryId: categoryIds.get(c.category),
        badge: c.badge,
        isFeatured: c.featured,
        position: i,
        linkedBundleProductId: c.bundle ? productIds.get(c.bundle) : null,
        items: { create: c.items.map((slug, j) => ({ productId: productIds.get(slug)!, position: j })) },
      },
    });
  }

  await seedHomepage(db);
  await db.taxRate.create({ data: { country: "IN", label: "GST", rateBps: 1800, inclusive: true } });
  console.log(`seed:demo — DEMO catalogue: ${DEMO_PRODUCTS.length} products, ${DEMO_BUNDLES.length} bundles, ${DEMO_COLLECTIONS.length} collections`);
}

/** Homepage is content-managed (master §39): sections and copy live in the database. */
export async function seedHomepage(db: PrismaClient): Promise<void> {
  const sections = [
    {
      key: "hero",
      type: "hero",
      config: {
        eyebrow: "Knowledge Resource & Management",
        title: "Practical Knowledge for a",
        highlight: "Better You.",
        body: "Digital books, guides and workbooks to help you learn, organize, build and grow.",
        primary: { label: "Explore Library", href: "/explore" },
        secondary: { label: "View Collections", href: "/collections" },
      },
    },
    { key: "formats", type: "formats", config: {} },
    { key: "shelf", type: "shelf", config: { eyebrow: "The Library", title: "Browse the shelf", limit: 28 } },
    { key: "featured", type: "product_rail", config: { eyebrow: "Featured", title: "Handpicked for You", source: "featured", limit: 6, href: "/explore?sort=featured" } },
    { key: "bundles", type: "bundles", config: { eyebrow: "Collections", title: "Curated Bundles for Your Journey", limit: 3, href: "/collections" } },
    {
      key: "why",
      type: "why",
      config: {
        eyebrow: "Why KRM.lib",
        title: "More Than Just Digital Books",
        body: "We create practical, high-quality resources to help you learn faster, stay organized, and build a better future.",
        points: [
          { title: "Practical Knowledge", body: "Real-world, actionable content." },
          { title: "Beautifully Designed", body: "Clean, focused and pleasant to read." },
          { title: "Instant Access", body: "Get your resources immediately." },
          { title: "Lifetime Ownership", body: "Download and keep forever." },
        ],
        cta: { label: "Our Story", href: "/about" },
      },
    },
    { key: "new", type: "product_rail", config: { eyebrow: "New Releases", title: "Fresh Additions to the Library", source: "new", limit: 6, href: "/new" } },
    {
      key: "newsletter",
      type: "newsletter",
      config: { eyebrow: "Join our community", title: "Learn. Build. Grow. Together.", body: "Get early access to new releases, exclusive discounts and useful resources." },
    },
  ];
  for (const [i, s] of sections.entries()) {
    await db.homepageSection.upsert({
      where: { key: s.key },
      create: { key: s.key, type: s.type, config: s.config, position: i },
      update: { type: s.type, config: s.config, position: i },
    });
  }
}
