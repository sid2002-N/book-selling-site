import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/modules/auth/schemas";

export const newsletterInput = z.object({ email: emailSchema, source: z.string().max(40).optional() });

/**
 * Newsletter signup. v1 records the subscription directly; double opt-in confirmation is on the
 * roadmap (ROADMAP "Marketing extras"). Responses never reveal whether an email was known.
 */
export async function subscribeToNewsletter(input: unknown, ip: string | null): Promise<void> {
  const { email, source } = newsletterInput.parse(input);
  await enforceRateLimit("newsletter", ip ?? email);
  await db.newsletterSubscriber.upsert({
    where: { email },
    create: { email, source: source ?? "site", status: "subscribed", confirmedAt: new Date() },
    update: { status: "subscribed", unsubscribedAt: null },
  });
}
