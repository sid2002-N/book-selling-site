import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { SETTING_DEFAULTS, type SettingKey, type SettingValue } from "./defaults";

const loadAll = cache(async (): Promise<Map<string, unknown>> => {
  const rows = await db.setting.findMany({ where: { isSecret: false }, select: { key: true, value: true } });
  return new Map(rows.map((r) => [r.key, r.value]));
});

/** Reads a non-secret setting, falling back to its default. Memoised per request. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const all = await loadAll();
  return (all.has(key) ? all.get(key) : SETTING_DEFAULTS[key]) as SettingValue<K>;
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>, updatedById?: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as never, updatedById },
    update: { value: value as never, updatedById },
  });
}
