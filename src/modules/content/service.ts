import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

const link = z.object({ label: z.string(), href: z.string() });

/** Section configs are validated on read so a bad CMS edit can't break the page. */
export const sectionSchemas = {
  hero: z.object({ eyebrow: z.string(), title: z.string(), highlight: z.string().optional(), body: z.string(), primary: link, secondary: link.optional() }),
  formats: z.object({}).passthrough(),
  shelf: z.object({ eyebrow: z.string().optional(), title: z.string(), limit: z.number().int().min(4).max(60).default(28) }),
  product_rail: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    source: z.enum(["featured", "new", "popular", "free"]),
    limit: z.number().int().min(2).max(12).default(6),
    href: z.string().optional(),
  }),
  bundles: z.object({ eyebrow: z.string().optional(), title: z.string(), limit: z.number().int().default(3), href: z.string().optional() }),
  why: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    body: z.string(),
    points: z.array(z.object({ title: z.string(), body: z.string() })),
    cta: link.optional(),
  }),
  newsletter: z.object({ eyebrow: z.string().optional(), title: z.string(), body: z.string() }),
} as const;

export type SectionType = keyof typeof sectionSchemas;
export type HomepageSection = {
  [K in SectionType]: { key: string; type: K; config: z.infer<(typeof sectionSchemas)[K]> };
}[SectionType];

export async function getHomepageSections(): Promise<HomepageSection[]> {
  const now = new Date();
  const rows = await db.homepageSection.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: { position: "asc" },
  });
  const sections: HomepageSection[] = [];
  for (const row of rows) {
    const schema = sectionSchemas[row.type as SectionType];
    if (!schema) continue;
    const parsed = schema.safeParse(row.config);
    if (parsed.success) sections.push({ key: row.key, type: row.type, config: parsed.data } as HomepageSection);
  }
  return sections;
}
