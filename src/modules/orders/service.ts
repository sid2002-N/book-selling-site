import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { formatMoney, type Currency } from "@/lib/money";
import { productHref, TYPE_LABEL, type ProductTypeKey } from "@/modules/catalog/types";
import { ORDER_STATUS_LABEL } from "@/modules/checkout/status-view";
import { refundEligibility } from "@/modules/payments";
import { getSetting } from "@/modules/settings";
import { storage } from "@/modules/storage";

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  placedAt: string;
  currency: Currency;
  totalMinor: number;
  itemCount: number;
  titles: string[];
};

const PAGE_SIZE = 10;

export async function listOrders(userId: string, page = 1): Promise<{ items: OrderListItem[]; page: number; totalPages: number; total: number }> {
  const where = { userId };
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { select: { titleSnapshot: true } } },
    }),
  ]);
  return {
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      statusLabel: ORDER_STATUS_LABEL[o.status],
      placedAt: o.placedAt.toISOString(),
      currency: o.currency as Currency,
      totalMinor: o.totalMinor,
      itemCount: o.items.length,
      titles: o.items.map((i) => i.titleSnapshot),
    })),
  };
}

export async function orderDetail(userId: string, orderId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: { product: { select: { id: true, slug: true, type: true, spineColor: true, status: true, cover: { select: { storageKey: true } } } } },
      },
      payments: { orderBy: { createdAt: "asc" }, select: { id: true, provider: true, status: true, method: true, amountMinor: true, createdAt: true, verifiedAt: true } },
      refunds: { orderBy: { createdAt: "desc" }, select: { id: true, refundNumber: true, status: true, amountMinor: true, reason: true, createdAt: true, completedAt: true } },
      invoice: { select: { invoiceNumber: true, issuedAt: true } },
    },
  });
  if (!order) throw new AppError("ORDER_NOT_FOUND", "We couldn't find that order.");
  const windowDays = await getSetting("refunds.windowDays");
  const refund = refundEligibility({
    status: order.status,
    paidAt: order.paidAt,
    totalMinor: order.totalMinor,
    windowDays,
    hasOpenRefund: order.refunds.some((r) => ["requested", "approved", "processing"].includes(r.status)),
  });
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    placedAt: order.placedAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    currency: order.currency as Currency,
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    coupon: order.couponCodeSnapshot,
    billingName: order.billingName,
    billingCountry: order.billingCountry,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      title: i.titleSnapshot,
      typeLabel: TYPE_LABEL[i.typeSnapshot as ProductTypeKey],
      href: i.product.status === "published" ? productHref(i.product.type as ProductTypeKey, i.product.slug) : null,
      spineColor: i.product.spineColor,
      coverUrl: i.product.cover ? storage().publicUrl(i.product.cover.storageKey) : null,
      unitPriceMinor: i.unitPriceMinor,
      discountMinor: i.discountMinor,
      totalMinor: i.unitPriceMinor - i.discountMinor,
    })),
    payments: order.payments.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), verifiedAt: p.verifiedAt?.toISOString() ?? null })),
    refunds: order.refunds.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), completedAt: r.completedAt?.toISOString() ?? null })),
    invoice: order.invoice ? { number: order.invoice.invoiceNumber, issuedAt: order.invoice.issuedAt.toISOString() } : null,
    refundable: refund.ok,
    refundBlockedReason: refund.ok ? null : refund.reason,
    refundWindowDays: windowDays,
  };
}

export type OrderDetail = Awaited<ReturnType<typeof orderDetail>>;

type InvoiceSnapshot = {
  seller: { name: string; taxId: string | null; address: string | null };
  buyer: { name: string | null; email: string | null; country: string; address: unknown };
  currency: Currency;
  lines: { title: string; type: string; unitPriceMinor: number; discountMinor: number; taxMinor: number; totalMinor: number }[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  coupon: string | null;
};

/**
 * Invoice PDF rendered on demand from the immutable snapshot taken at payment time, so it
 * never drifts from what was charged. Access is checked by the caller (owner or guest token).
 */
export async function renderInvoicePdf(orderId: string): Promise<{ filename: string; bytes: Uint8Array }> {
  const invoice = await db.invoice.findUnique({ where: { orderId }, include: { order: { select: { orderNumber: true, paidAt: true } } } });
  if (!invoice) throw new AppError("NOT_FOUND", "An invoice is issued once the order is paid.");
  const snap = invoice.legalSnapshot as unknown as InvoiceSnapshot;
  const m = (amountMinor: number) => formatMoney({ amountMinor, currency: snap.currency }, { showZeroDecimals: true, code: true });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.invoiceNumber}`);
  pdf.setAuthor(snap.seller.name);
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.17, 0.12, 0.09);
  const muted = rgb(0.45, 0.37, 0.31);
  const accent = rgb(0.85, 0.54, 0.17);
  const ascii = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, "?");
  const text = (s: string, x: number, y: number, opts: { size?: number; font?: typeof sans; color?: typeof ink } = {}) =>
    page.drawText(ascii(s), { x, y, size: opts.size ?? 10, font: opts.font ?? sans, color: opts.color ?? ink });
  const right = (s: string, xRight: number, y: number, opts: { size?: number; font?: typeof sans } = {}) => {
    const font = opts.font ?? sans;
    const size = opts.size ?? 10;
    text(s, xRight - font.widthOfTextAtSize(ascii(s), size), y, { size, font });
  };

  text("KRM", 48, 780, { size: 24, font: serif });
  text(".", 48 + serif.widthOfTextAtSize("KRM", 24), 780, { size: 24, font: serif, color: accent });
  text("lib", 48 + serif.widthOfTextAtSize("KRM.", 24), 780, { size: 24, font: serif });
  right("TAX INVOICE", 547, 784, { size: 12, font: bold });
  right(invoice.invoiceNumber, 547, 768);
  right(`Issued ${invoice.issuedAt.toISOString().slice(0, 10)}`, 547, 754);
  right(`Order ${invoice.order.orderNumber}`, 547, 740);

  let y = 700;
  text("From", 48, y, { font: bold, size: 9, color: muted });
  text("Billed to", 320, y, { font: bold, size: 9, color: muted });
  y -= 16;
  text(snap.seller.name, 48, y);
  text(snap.buyer.name ?? "Customer", 320, y);
  y -= 14;
  if (snap.seller.taxId) text(`Tax ID: ${snap.seller.taxId}`, 48, y);
  if (snap.buyer.email) text(snap.buyer.email, 320, y);
  y -= 14;
  if (snap.seller.address) text(snap.seller.address.slice(0, 60), 48, y);
  text(`Country: ${snap.buyer.country}`, 320, y);

  y = 610;
  page.drawRectangle({ x: 48, y: y - 6, width: 499, height: 22, color: rgb(0.97, 0.93, 0.87) });
  text("Item", 56, y, { font: bold, size: 9 });
  right("Price", 400, y, { font: bold, size: 9 });
  right("Discount", 470, y, { font: bold, size: 9 });
  right("Amount", 540, y, { font: bold, size: 9 });
  y -= 26;
  for (const line of snap.lines) {
    text(line.title.slice(0, 52), 56, y);
    right(m(line.unitPriceMinor), 400, y);
    right(line.discountMinor ? `-${m(line.discountMinor)}` : "-", 470, y);
    right(m(line.totalMinor), 540, y);
    y -= 20;
  }
  page.drawLine({ start: { x: 48, y: y + 8 }, end: { x: 547, y: y + 8 }, thickness: 0.5, color: muted });
  y -= 10;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, 360, y, { font: strong ? bold : sans });
    right(value, 540, y, { font: strong ? bold : sans, size: strong ? 12 : 10 });
    y -= 18;
  };
  totalRow("Subtotal", m(snap.subtotalMinor));
  if (snap.discountMinor) totalRow(`Discount${snap.coupon ? ` (${snap.coupon})` : ""}`, `-${m(snap.discountMinor)}`);
  totalRow("Total paid", m(snap.totalMinor), true);
  if (snap.taxMinor) {
    text(`Prices include tax of ${m(snap.taxMinor)}.`, 360, y, { size: 9, color: muted });
    y -= 18;
  }

  text("Digital products are delivered to your KRM.lib library. Thank you for reading with us.", 48, 72, { size: 9, color: muted });
  text("A small library for a bigger tomorrow.", 48, 58, { size: 9, font: serif, color: muted });

  return { filename: `${invoice.invoiceNumber}.pdf`, bytes: await pdf.save() };
}
