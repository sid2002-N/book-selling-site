import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { UserStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit, requirePermission } from "@/modules/admin";
import { revokeAllSessions } from "@/modules/auth";

const PAGE_SIZE = 25;
const PAID = ["paid", "partially_refunded"] as const;

export async function listCustomers(params: { q?: string; status?: string; page?: number }) {
  await requirePermission("customers.read");
  const where: Prisma.UserWhereInput = { adminUser: null, deletedAt: null };
  if (params.status === "active" || params.status === "blocked" || params.status === "locked") where.status = params.status as UserStatus;
  const q = params.q?.trim();
  if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }];
  const page = Math.max(1, params.page ?? 1);
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        country: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        _count: { select: { orders: { where: { status: { in: [...PAID] } } }, libraryItems: { where: { revokedAt: null } } } },
      },
    }),
    db.user.count({ where }),
  ]);
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function customerDetail(userId: string) {
  const ctx = await requirePermission("customers.read");
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      country: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      lockedUntil: true,
      adminUser: { select: { userId: true } },
      twoFactor: { select: { enabledAt: true } },
      accounts: { select: { provider: true } },
    },
  });
  if (!user) throw new AppError("NOT_FOUND", "That customer doesn't exist.");
  const [orders, library, downloads, sessions, spend, reviews] = await Promise.all([
    db.order.findMany({ where: { userId }, orderBy: { placedAt: "desc" }, take: 20, select: { id: true, orderNumber: true, status: true, totalMinor: true, currency: true, placedAt: true } }),
    db.libraryItem.findMany({ where: { userId }, orderBy: { grantedAt: "desc" }, take: 30, select: { id: true, source: true, grantedAt: true, revokedAt: true, product: { select: { id: true, title: true } } } }),
    db.downloadEvent.count({ where: { userId, status: "completed" } }),
    db.session.count({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } } }),
    db.order.groupBy({ by: ["currency"], where: { userId, status: { in: [...PAID] } }, _sum: { totalMinor: true } }),
    db.review.count({ where: { userId, deletedAt: null } }),
  ]);
  return {
    user,
    orders,
    library,
    downloads,
    activeSessions: sessions,
    spend: spend.map((s) => ({ currency: s.currency, amountMinor: s._sum.totalMinor ?? 0 })),
    reviews,
    canManage: ctx.permissions.has("customers.manage") && !user.adminUser,
  };
}

async function manageableCustomer(userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, status: true, adminUser: { select: { userId: true } } } });
  if (!user) throw new AppError("NOT_FOUND", "That customer doesn't exist.");
  // Admin accounts are managed from Security (security.manage), never from the customer list.
  if (user.adminUser) throw new AppError("FORBIDDEN", "Admin accounts can't be changed here.");
  return user;
}

/** Blocking signs the customer out everywhere; their purchases stay intact. */
export async function blockCustomer(userId: string, reason: string) {
  const ctx = await requirePermission("customers.manage");
  const user = await manageableCustomer(userId);
  if (!reason.trim()) throw new AppError("VALIDATION_ERROR", "Add a reason for blocking.", { fields: { reason: "Required for the audit log." } });
  if (user.status === "blocked") return;
  await db.user.update({ where: { id: userId }, data: { status: "blocked" } });
  const revoked = await revokeAllSessions(userId);
  await audit({ actorUserId: ctx.user.id, action: "customer.block", entityType: "user", entityId: userId, before: { status: user.status }, after: { status: "blocked", reason: reason.trim().slice(0, 300), revokedSessions: revoked } });
  await db.securityEvent.create({ data: { type: "account_blocked", severity: "warning", userId, meta: { by: ctx.user.id } } });
}

export async function unblockCustomer(userId: string) {
  const ctx = await requirePermission("customers.manage");
  const user = await manageableCustomer(userId);
  if (user.status !== "blocked" && user.status !== "locked") return;
  await db.user.update({ where: { id: userId }, data: { status: "active", lockedUntil: null, failedLoginCount: 0 } });
  await audit({ actorUserId: ctx.user.id, action: "customer.unblock", entityType: "user", entityId: userId, before: { status: user.status }, after: { status: "active" } });
}

export async function revokeCustomerSessions(userId: string) {
  const ctx = await requirePermission("customers.manage");
  await manageableCustomer(userId);
  const revoked = await revokeAllSessions(userId);
  await audit({ actorUserId: ctx.user.id, action: "customer.sessions.revoke", entityType: "user", entityId: userId, after: { revoked } });
  return revoked;
}
