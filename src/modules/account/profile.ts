import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

export const profileInput = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase())
    .nullish(),
  bio: z.string().trim().max(280, { error: "Keep your bio under 280 characters." }).nullish(),
  newsletter: z.boolean(),
});

export async function accountProfile(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, country: true, bio: true, emailVerifiedAt: true, createdAt: true } });
  const sub = await db.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { status: true } });
  return { ...user, emailVerified: Boolean(user.emailVerifiedAt), createdAt: user.createdAt.toISOString(), newsletter: sub?.status === "subscribed" };
}

export async function updateProfile(userId: string, input: z.infer<typeof profileInput>): Promise<void> {
  const user = await db.user.update({ where: { id: userId }, data: { name: input.name, country: input.country ?? null, bio: input.bio || null }, select: { email: true } });
  if (input.newsletter) {
    await db.newsletterSubscriber.upsert({
      where: { email: user.email },
      create: { email: user.email, status: "subscribed", source: "account", confirmedAt: new Date() },
      update: { status: "subscribed", unsubscribedAt: null, confirmedAt: new Date() },
    });
  } else {
    await db.newsletterSubscriber.updateMany({ where: { email: user.email, status: { not: "unsubscribed" } }, data: { status: "unsubscribed", unsubscribedAt: new Date() } });
  }
}
