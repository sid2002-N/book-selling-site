import type { PrismaClient } from "../../src/generated/prisma/client";

/**
 * DEMO DATA — gives the demo reader a small library so the shelf, reader, downloads and
 * "update available" states can be exercised locally. Items are admin grants (not fake
 * purchases), so no orders or revenue are invented.
 */
export async function seedDemoLibrary(db: PrismaClient): Promise<void> {
  const reader = await db.user.findUnique({ where: { email: "reader@krmlib.local" } });
  if (!reader) return;
  const products = await db.product.findMany({
    where: { status: "published", type: { in: ["book", "guide", "workbook"] } },
    orderBy: { title: "asc" },
    take: 6,
    include: { versions: { orderBy: { createdAt: "asc" }, select: { id: true, pageCount: true } } },
  });
  for (const [i, p] of products.entries()) {
    // The first title with two versions keeps the older one, so "update available" shows.
    const older = p.versions.length > 1 && i % 2 === 0 ? p.versions[0]!.id : p.currentVersionId;
    const item = await db.libraryItem.upsert({
      where: { userId_productId: { userId: reader.id, productId: p.id } },
      create: { userId: reader.id, productId: p.id, source: "admin_grant", ownedVersionId: older, isFavorite: i === 1, lastOpenedAt: i < 2 ? new Date(Date.now() - i * 3_600_000) : null },
      update: {},
    });
    const total = p.versions.at(-1)?.pageCount ?? 0;
    if (i < 2 && total > 0) {
      const page = Math.max(1, Math.round(total * (i === 0 ? 0.32 : 0.18)));
      await db.readingProgress.upsert({ where: { libraryItemId: item.id }, create: { libraryItemId: item.id, lastPage: page, totalPages: total }, update: {} });
    }
  }
  console.log(`seed:demo — demo reader library: ${products.length} titles (admin grants)`);
}
