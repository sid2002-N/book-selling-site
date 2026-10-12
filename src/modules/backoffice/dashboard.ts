import "server-only";
import { db } from "@/lib/db";
import type { Currency } from "@/lib/money";
import { requirePermission } from "@/modules/admin";

const DAY = 86_400_000;
const PAID = ["paid", "partially_refunded", "refunded", "disputed"] as const;

export type Delta = { current: number; previous: number };

/** UTC day key (YYYY-MM-DD). */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Zero-filled daily series so the chart never invents or skips days. */
export function dailySeries(rows: { day: string; amountMinor: number }[], from: Date, days: number): { day: string; amountMinor: number }[] {
  const map = new Map(rows.map((r) => [r.day, r.amountMinor]));
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(new Date(from.getTime() + i * DAY));
    return { day, amountMinor: map.get(day) ?? 0 };
  });
}

/**
 * Dashboard metrics (DESIGN_SYSTEM §15: metric → trend → detail). Every number comes from source
 * rows; revenue is gross paid order value minus completed refunds, per currency (no FX).
 */
export async function dashboard(rangeDays = 30) {
  await requirePermission("analytics.read");
  const now = new Date();
  const todayStart = new Date(dayKey(now) + "T00:00:00.000Z");
  const from = new Date(todayStart.getTime() - (rangeDays - 1) * DAY);
  const prevFrom = new Date(from.getTime() - rangeDays * DAY);

  const revenueBetween = async (start: Date, end: Date) => {
    const [gross, refunds] = await Promise.all([
      db.order.groupBy({ by: ["currency"], where: { status: { in: [...PAID] }, paidAt: { gte: start, lt: end } }, _sum: { totalMinor: true }, _count: { _all: true } }),
      db.refund.groupBy({ by: ["currency"], where: { status: "completed", completedAt: { gte: start, lt: end } }, _sum: { amountMinor: true } }),
    ]);
    const out: Record<Currency, { revenue: number; orders: number }> = { INR: { revenue: 0, orders: 0 }, USD: { revenue: 0, orders: 0 } };
    for (const g of gross) out[g.currency] = { revenue: g._sum.totalMinor ?? 0, orders: g._count._all };
    for (const r of refunds) out[r.currency].revenue -= r._sum.amountMinor ?? 0;
    return out;
  };

  const [current, previous, customersNow, customersPrev, downloadsNow, downloadsPrev, pendingRefunds, pendingReviews, failedWebhooks, liveProducts, draftProducts, series, recentOrders, topProducts] =
    await Promise.all([
      revenueBetween(from, new Date(now.getTime() + 1)),
      revenueBetween(prevFrom, from),
      db.user.count({ where: { adminUser: null, createdAt: { gte: from } } }),
      db.user.count({ where: { adminUser: null, createdAt: { gte: prevFrom, lt: from } } }),
      db.downloadEvent.count({ where: { status: "completed", createdAt: { gte: from } } }),
      db.downloadEvent.count({ where: { status: "completed", createdAt: { gte: prevFrom, lt: from } } }),
      db.refund.count({ where: { status: "requested" } }),
      db.review.count({ where: { status: "pending", deletedAt: null } }),
      db.webhookEvent.count({ where: { status: "failed", receivedAt: { gte: from } } }),
      db.product.count({ where: { status: "published", deletedAt: null } }),
      db.product.count({ where: { status: "draft", deletedAt: null } }),
      db.$queryRaw<{ day: string; currency: Currency; amount: bigint }[]>`
        SELECT to_char(date_trunc('day', paid_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, currency::text AS currency, SUM(total_minor)::bigint AS amount
        FROM "order"
        WHERE status::text IN ('paid','partially_refunded','refunded','disputed') AND paid_at >= ${from}
        GROUP BY 1, 2`,
      db.order.findMany({
        orderBy: { placedAt: "desc" },
        take: 6,
        select: { id: true, orderNumber: true, status: true, totalMinor: true, currency: true, placedAt: true, guestEmail: true, user: { select: { name: true } } },
      }),
      db.orderItem.groupBy({
        by: ["productId"],
        where: { order: { status: { in: ["paid", "partially_refunded"] }, paidAt: { gte: from } } },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 5,
      }),
    ]);

  const titles = await db.product.findMany({ where: { id: { in: topProducts.map((t) => t.productId) } }, select: { id: true, title: true, type: true } });
  const byId = new Map(titles.map((t) => [t.id, t]));
  const toSeries = (c: Currency) =>
    dailySeries(
      series.filter((s) => s.currency === c).map((s) => ({ day: s.day, amountMinor: Number(s.amount) })),
      from,
      rangeDays,
    );

  return {
    rangeDays,
    from,
    revenue: { INR: { current: current.INR.revenue, previous: previous.INR.revenue }, USD: { current: current.USD.revenue, previous: previous.USD.revenue } } satisfies Record<Currency, Delta>,
    orders: { current: current.INR.orders + current.USD.orders, previous: previous.INR.orders + previous.USD.orders } satisfies Delta,
    customers: { current: customersNow, previous: customersPrev } satisfies Delta,
    downloads: { current: downloadsNow, previous: downloadsPrev } satisfies Delta,
    attention: { pendingRefunds, pendingReviews, failedWebhooks },
    catalog: { live: liveProducts, drafts: draftProducts },
    series: { INR: toSeries("INR"), USD: toSeries("USD") },
    recentOrders,
    topProducts: topProducts.map((t) => ({ productId: t.productId, title: byId.get(t.productId)?.title ?? "Removed product", sales: t._count._all })),
  };
}

/** Percentage change, or null when there is no baseline to compare against. */
export function percentChange(d: Delta): number | null {
  if (d.previous === 0) return null;
  return Math.round(((d.current - d.previous) / Math.abs(d.previous)) * 100);
}
