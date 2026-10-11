import type { PrismaClient } from "../../src/generated/prisma/client";
import { DEFAULT_ROLES, PERMISSIONS } from "../../src/modules/admin/permissions";
import { SETTING_DEFAULTS } from "../../src/modules/settings/defaults";

/**
 * Production-safe seed: permissions, system roles, setting defaults and legal placeholders.
 * Idempotent — safe to run on every deploy.
 */
export async function seedMinimal(db: PrismaClient): Promise<void> {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, create: { key, description }, update: { description } });
  }

  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    const record = await db.adminRole.upsert({
      where: { key },
      create: { key, name: role.name, description: role.description, isSystem: true },
      update: { name: role.name, description: role.description, isSystem: true },
    });
    await db.rolePermission.deleteMany({ where: { roleId: record.id } });
    await db.rolePermission.createMany({
      data: role.permissions.map((permissionKey) => ({ roleId: record.id, permissionKey })),
    });
  }

  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await db.setting.upsert({ where: { key }, create: { key, value: value as never }, update: {} });
  }

  await db.license.upsert({
    where: { key: "personal" },
    create: {
      key: "personal",
      name: "Personal Digital License",
      summary: "Placeholder — final license terms to be supplied by the store owner (OQ-5).",
    },
    update: {},
  });

  console.log("seed:minimal — permissions, roles, settings, license placeholder ready");
}
