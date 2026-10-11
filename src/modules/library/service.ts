import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { productHref, TYPE_LABEL, type ProductTypeKey } from "@/modules/catalog/types";
import { progressPercent } from "@/modules/delivery/policy";
import { storage } from "@/modules/storage";

export type LibrarySection = "all" | "reading" | "favorites" | "updates" | "archived" | "recent";
export const LIBRARY_SECTIONS: { value: LibrarySection; label: string }[] = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recently added" },
  { value: "reading", label: "Reading" },
  { value: "favorites", label: "Favourites" },
  { value: "updates", label: "Updates" },
  { value: "archived", label: "Archived" },
];
export type LibrarySort = "recent" | "title" | "last_read";

export type LibraryEntry = {
  id: string;
  productId: string;
  title: string;
  subtitle: string | null;
  type: ProductTypeKey;
  typeLabel: string;
  href: string;
  readHref: string;
  coverUrl: string | null;
  spineColor: string;
  category: string | null;
  progress: number;
  lastPage: number | null;
  totalPages: number | null;
  lastChapter: string | null;
  isFavorite: boolean;
  archived: boolean;
  updateAvailable: boolean;
  currentVersion: string | null;
  grantedAt: string;
  lastOpenedAt: string | null;
  source: string;
};

const entryInclude = {
  progress: true,
  product: {
    select: {
      id: true,
      title: true,
      subtitle: true,
      slug: true,
      type: true,
      spineColor: true,
      currentVersionId: true,
      currentVersion: { select: { version: true } },
      cover: { select: { storageKey: true } },
      primaryCategory: { select: { name: true } },
    },
  },
} satisfies Prisma.LibraryItemInclude;

type Row = Prisma.LibraryItemGetPayload<{ include: typeof entryInclude }>;

function toEntry(row: Row): LibraryEntry {
  const p = row.product;
  const type = p.type as ProductTypeKey;
  return {
    id: row.id,
    productId: p.id,
    title: p.title,
    subtitle: p.subtitle,
    type,
    typeLabel: TYPE_LABEL[type],
    href: `/account/library/${row.id}`,
    readHref: `/read/${row.id}`,
    coverUrl: p.cover ? storage().publicUrl(p.cover.storageKey) : null,
    spineColor: p.spineColor,
    category: p.primaryCategory?.name ?? null,
    progress: progressPercent(row.progress?.lastPage, row.progress?.totalPages),
    lastPage: row.progress?.lastPage ?? null,
    totalPages: row.progress?.totalPages ?? null,
    lastChapter: row.progress?.lastChapterRef ?? null,
    isFavorite: row.isFavorite,
    archived: Boolean(row.archivedAt),
    updateAvailable: Boolean(p.currentVersionId && row.ownedVersionId && row.ownedVersionId !== p.currentVersionId),
    currentVersion: p.currentVersion?.version ?? null,
    grantedAt: row.grantedAt.toISOString(),
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    source: row.source,
  };
}

/** The customer's library (F11). Only active (non-revoked) items are ever returned. */
export async function libraryEntries(
  userId: string,
  options: { section?: LibrarySection; type?: ProductTypeKey | null; sort?: LibrarySort; q?: string | null; take?: number } = {},
): Promise<LibraryEntry[]> {
  const section = options.section ?? "all";
  const where: Prisma.LibraryItemWhereInput = {
    userId,
    revokedAt: null,
    archivedAt: section === "archived" ? { not: null } : null,
    ...(section === "favorites" ? { isFavorite: true } : {}),
    ...(section === "reading" ? { progress: { isNot: null } } : {}),
    ...(section === "recent" ? { grantedAt: { gt: new Date(Date.now() - 30 * 86_400_000) } } : {}),
    product: {
      ...(options.type ? { type: options.type } : {}),
      ...(options.q ? { title: { contains: options.q, mode: "insensitive" as const } } : {}),
    },
  };
  const orderBy: Prisma.LibraryItemOrderByWithRelationInput[] =
    options.sort === "title" ? [{ product: { title: "asc" } }] : options.sort === "last_read" || section === "reading" ? [{ lastOpenedAt: { sort: "desc", nulls: "last" } }, { grantedAt: "desc" }] : [{ grantedAt: "desc" }];
  const rows = await db.libraryItem.findMany({ where, orderBy, include: entryInclude, take: options.take });
  let entries = rows.map(toEntry);
  if (section === "updates") entries = entries.filter((e) => e.updateAvailable);
  if (section === "reading") entries = entries.filter((e) => e.progress > 0 && e.progress < 100);
  return entries;
}

export async function libraryEntry(userId: string, libraryItemId: string) {
  const row = await db.libraryItem.findFirst({
    where: { id: libraryItemId, userId, revokedAt: null },
    include: {
      progress: true,
      bookmarks: { orderBy: { page: "asc" } },
      product: {
        select: {
          id: true,
          title: true,
          subtitle: true,
          slug: true,
          type: true,
          spineColor: true,
          currentVersionId: true,
          cover: { select: { storageKey: true } },
          primaryCategory: { select: { name: true } },
          shortDescription: true,
          description: true,
          language: true,
          tocEntries: { orderBy: { position: "asc" }, select: { id: true, title: true, pageNumber: true, parentId: true } },
          currentVersion: { select: { version: true, releasedAt: true, changelog: true, pageCount: true, files: { select: { kind: true, sizeBytes: true, mime: true, pageCount: true } } } },
          bundleItems: { select: { product: { select: { id: true, title: true } } } },
        },
      },
    },
  });
  if (!row) throw new AppError("NOT_FOUND", "This item isn't in your library.");
  const file = row.product.currentVersion?.files[0] ?? null;
  return {
    ...toEntry(row),
    productHref: productHref(row.product.type as ProductTypeKey, row.product.slug),
    shortDescription: row.product.shortDescription,
    description: row.product.description,
    language: row.product.language,
    pages: row.product.currentVersion?.pageCount ?? file?.pageCount ?? null,
    file: file ? { kind: file.kind, sizeBytes: file.sizeBytes, mime: file.mime } : null,
    releasedAt: row.product.currentVersion?.releasedAt?.toISOString() ?? null,
    changelog: row.product.currentVersion?.changelog ?? null,
    toc: row.product.tocEntries,
    bookmarks: row.bookmarks.map((b) => ({ id: b.id, page: b.page, label: b.label })),
    bundleContents: await Promise.all(
      row.product.bundleItems.map(async (b) => {
        const child = await db.libraryItem.findUnique({ where: { userId_productId: { userId, productId: b.product.id } }, select: { id: true, revokedAt: true } });
        return { ...b.product, libraryItemId: child && !child.revokedAt ? child.id : null };
      }),
    ),
  };
}

export type LibraryEntryDetail = Awaited<ReturnType<typeof libraryEntry>>;

export async function setLibraryFlag(userId: string, libraryItemId: string, flag: "favorite" | "archive", value: boolean): Promise<void> {
  const result = await db.libraryItem.updateMany({
    where: { id: libraryItemId, userId, revokedAt: null },
    data: flag === "favorite" ? { isFavorite: value } : { archivedAt: value ? new Date() : null },
  });
  if (result.count === 0) throw new AppError("NOT_FOUND", "This item isn't in your library.");
}

/** Dashboard numbers — all counted from real rows (no placeholders, C6). */
export async function libraryStats(userId: string) {
  const [byType, downloads] = await Promise.all([
    db.libraryItem.findMany({ where: { userId, revokedAt: null }, select: { product: { select: { type: true } } } }),
    db.downloadEvent.count({ where: { userId, status: { in: ["issued", "completed"] } } }),
  ]);
  const count = (t: ProductTypeKey) => byType.filter((r) => r.product.type === t).length;
  return { total: byType.length, books: count("book"), guides: count("guide"), workbooks: count("workbook"), bundles: count("bundle"), free: count("free_resource"), downloads };
}
