/** Data a spine needs — all of it comes from the Product record (master §9). */
export type ShelfBook = {
  id: string;
  title: string;
  href: string;
  /** Human label: Book, Guide, Workbook, Bundle, Free. */
  typeLabel: string;
  category?: string | null;
  spineColor?: string | null;
  coverUrl?: string | null;
  summary?: string | null;
  /** Formatted server-side, e.g. "₹799". Omitted when not applicable. */
  priceLabel?: string | null;
  /** 0–100 reading progress for owned books. */
  progress?: number | null;
  /** Owned-library context: primary action becomes "Continue Reading". */
  readHref?: string | null;
};
