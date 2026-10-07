import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getCurrentSession, type CurrentSession } from "@/modules/auth";
import type { PermissionKey } from "./permissions";

export type AdminContext = CurrentSession & { permissions: ReadonlySet<PermissionKey> };

/** Resolves the admin's effective permissions from their roles; memoised per request. */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const session = await getCurrentSession();
  if (!session?.user.isAdmin) return null;
  const roles = await db.adminUserRole.findMany({
    where: { adminUserId: session.user.id },
    select: { role: { select: { permissions: { select: { permissionKey: true } } } } },
  });
  const permissions = new Set<PermissionKey>();
  for (const r of roles) for (const p of r.role.permissions) permissions.add(p.permissionKey as PermissionKey);
  return { ...session, permissions };
});

/** Admin access needs a session, an active admin record and a satisfied (mandatory) 2FA. */
function assertAdminReady(ctx: AdminContext | null): asserts ctx is AdminContext {
  if (!ctx) throw new AppError("FORBIDDEN", "You don't have access to this area.");
  if (!ctx.user.twoFactorEnabled) throw new AppError("TWO_FACTOR_REQUIRED", "Set up two-factor authentication to use the admin area.");
  if (!ctx.twoFactorPassed) throw new AppError("TWO_FACTOR_REQUIRED", "Enter your verification code to continue.");
}

export function hasPermission(ctx: Pick<AdminContext, "permissions">, permission: PermissionKey): boolean {
  return ctx.permissions.has(permission);
}

/** Server-side authorization for admin services and route handlers. */
export async function requirePermission(permission: PermissionKey): Promise<AdminContext> {
  const ctx = await getAdminContext();
  assertAdminReady(ctx);
  if (!hasPermission(ctx, permission)) {
    await db.securityEvent.create({
      data: { type: "permission_denied", severity: "warning", userId: ctx.user.id, meta: { permission } },
    });
    throw new AppError("FORBIDDEN", "You don't have permission to do that.");
  }
  return ctx;
}

/** Page guard: redirects to sign-in, 2FA setup/challenge or the branded 403 page. */
export async function requireAdminPage(permission: PermissionKey, path: string): Promise<AdminContext> {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!session.user.isAdmin) redirect("/403");
  if (!session.user.twoFactorEnabled) redirect(`/account/security?setup2fa=1&next=${encodeURIComponent(path)}`);
  if (!session.twoFactorPassed) redirect(`/2fa?next=${encodeURIComponent(path)}`);
  const ctx = await getAdminContext();
  if (!ctx || !hasPermission(ctx, permission)) redirect("/403");
  return ctx;
}
