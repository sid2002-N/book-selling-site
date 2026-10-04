import "server-only";
import { db } from "@/lib/db";

export async function hasPasswordCredential(userId: string): Promise<boolean> {
  const count = await db.account.count({ where: { userId, provider: "credentials", passwordHash: { not: null } } });
  return count > 0;
}
