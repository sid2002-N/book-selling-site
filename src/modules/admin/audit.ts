import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";
import { requestContext } from "@/lib/request";

/** Every admin mutation writes an append-only audit entry (SECURITY §2, DATABASE §9). */
export async function audit(
  entry: {
    actorUserId: string | null;
    actorType?: "admin" | "system" | "customer";
    action: string;
    entityType?: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
  },
  tx: Tx | typeof db = db,
): Promise<void> {
  const ctx = await requestContext().catch(() => ({ ip: null, userAgent: null }));
  await tx.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      actorType: entry.actorType ?? "admin",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}
