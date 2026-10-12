import { CircleCheck, CircleDashed, CircleAlert, ExternalLink, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveProductAction,
  deletePreviewAction,
  discardVersionAction,
  publishProductAction,
  publishVersionAction,
  removeCoverAction,
  restoreProductAction,
  unpublishProductAction,
} from "../../actions";
import { CategoriesForm, ContentForm, DetailsForm, MetadataForm, PricingForm, SeoForm, UploadForm } from "./editor";
import { ActionButton } from "@/components/admin/ActionButton";
import { fmtBytes, fmtDate, fmtDateTime, humanize } from "@/components/admin/format";
import { PageHeader, Panel, StatusChip, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { isAppError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { requireAdminPage } from "@/modules/admin";
import { UPLOAD_RULES, getProductForEdit, minorToMajorString, nextVersionLabel, type ReadinessStep } from "@/modules/backoffice";
import { productHref } from "@/modules/catalog";

export const metadata: Metadata = { title: "Edit product" };

/** The 11-step creation flow (UX Flow 16) as a stepper: each step validates; publish is gated. */
const STEPS: { key: ReadinessStep | "metadata" | "review"; label: string; bundle?: boolean }[] = [
  { key: "details", label: "Basic info", bundle: true },
  { key: "cover", label: "Cover", bundle: true },
  { key: "file", label: "File & versions" },
  { key: "previews", label: "Preview pages" },
  { key: "metadata", label: "Metadata", bundle: true },
  { key: "pricing", label: "Pricing", bundle: true },
  { key: "categories", label: "Categories", bundle: true },
  { key: "seo", label: "SEO", bundle: true },
  { key: "content", label: "Contents & FAQ", bundle: true },
  { key: "review", label: "Review & publish", bundle: true },
];

export default async function ProductEditorPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const ctx = await requireAdminPage("products.read", `/admin/products/${id}`);
  const sp = await searchParams;
  const data = await getProductForEdit(id).catch((error) => {
    if (isAppError(error) && error.code === "PRODUCT_NOT_FOUND") notFound();
    throw error;
  });
  const { product: p, checks } = data;
  const isBundle = p.type === "bundle";
  const steps = STEPS.filter((s) => !isBundle || s.bundle);
  const requested = typeof sp.step === "string" ? sp.step : "review";
  const step = steps.find((s) => s.key === requested) ?? steps.at(-1)!;
  const stepIndex = steps.indexOf(step);
  const nextHref = stepIndex < steps.length - 1 ? `/admin/products/${id}?step=${steps[stepIndex + 1]!.key}` : undefined;
  const canEdit = ctx.permissions.has("products.update") && p.status !== "archived";
  const canPublish = ctx.permissions.has("products.publish");
  const missing = checks.filter((c) => c.required && !c.ok);
  const stepState = (key: string) => {
    const own = checks.filter((c) => c.step === key);
    if (!own.length) return "none" as const;
    if (own.some((c) => c.required && !c.ok)) return "missing" as const;
    return own.every((c) => c.ok) ? ("done" as const) : ("partial" as const);
  };
  const price = (c: "INR" | "USD") => p.prices.find((x) => x.currency === c && !x.startsAt && !x.endsAt);
  const current = p.versions.find((v) => v.id === p.currentVersionId);
  const draftVersion = p.versions.find((v) => v.status === "draft");
  const storeHref = productHref(p.type, p.slug);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={p.title}
        badge={<StatusChip value={p.status} />}
        description={`${humanize(p.type)} · ${data.sales} paid sale${data.sales === 1 ? "" : "s"} · ${p._count.libraryItems} in libraries · updated ${fmtDateTime(p.updatedAt)}`}
        actions={
          <>
            {p.status === "published" ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={storeHref} target="_blank">
                  View on store <ExternalLink />
                </Link>
              </Button>
            ) : null}
            {canPublish && p.status === "published" ? (
              <ActionButton action={unpublishProductAction.bind(null, id)} confirm={{ title: "Unpublish this product?", description: "It disappears from the shelf, catalogue and search. Customers who own it keep their copy.", confirmLabel: "Unpublish" }}>
                Unpublish
              </ActionButton>
            ) : null}
            {canPublish && p.status !== "published" && p.status !== "archived" ? (
              <ActionButton action={publishProductAction.bind(null, id)} variant="primary" confirm={missing.length ? undefined : { title: "Publish this product?", description: "It will appear on the shelf, in its categories and in search straight away.", confirmLabel: "Publish" }}>
                Publish
              </ActionButton>
            ) : null}
            {ctx.permissions.has("products.delete") && p.status !== "archived" && p.status !== "published" ? (
              <ActionButton action={archiveProductAction.bind(null, id)} variant="ghost" confirm={{ title: "Archive this product?", description: "It's hidden from the store and from this list's default view. Owners keep access. You can restore it later.", confirmLabel: "Archive", destructive: true }}>
                Archive
              </ActionButton>
            ) : null}
            {ctx.permissions.has("products.delete") && p.status === "archived" ? (
              <ActionButton action={restoreProductAction.bind(null, id)}>Restore as draft</ActionButton>
            ) : null}
          </>
        }
      />

      {sp.created ? (
        <p className="mb-4 rounded-md border border-success/30 bg-success-soft px-4 py-2.5 text-body-sm text-fg">Draft created. Work through the steps — Publish unlocks when every required step is complete.</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <nav aria-label="Product steps" className="lg:col-span-3">
          <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {steps.map((s, i) => {
              const state = s.key === "review" ? (missing.length ? "missing" : "done") : stepState(s.key);
              const Icon = state === "done" ? CircleCheck : state === "missing" ? CircleAlert : CircleDashed;
              return (
                <li key={s.key} className="shrink-0">
                  <Link
                    href={`/admin/products/${id}?step=${s.key}`}
                    aria-current={s.key === step.key ? "step" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-sm px-3 text-label font-medium whitespace-nowrap",
                      s.key === step.key ? "bg-ink text-fg-on-ink" : "text-fg-secondary hover:bg-canvas-subtle hover:text-fg",
                    )}
                  >
                    <span className="w-4 text-caption tabular-nums opacity-70">{i + 1}</span>
                    <span className="flex-1">{s.label}</span>
                    <Icon className={cn("size-4", s.key !== step.key && (state === "done" ? "text-success" : state === "missing" ? "text-warning" : "text-fg-muted"))} aria-label={state === "done" ? "Complete" : state === "missing" ? "Needs attention" : "Optional"} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
          {!canEdit && step.key !== "review" ? (
            <p className="rounded-md border border-line bg-canvas-subtle px-4 py-2.5 text-body-sm text-fg-secondary">
              {p.status === "archived" ? "This product is archived. Restore it to make changes." : "You can view this product but not change it."}
            </p>
          ) : null}

          {step.key === "details" ? (
            <Panel title="Basic info">
              <DetailsForm productId={id} nextHref={nextHref} readOnly={!canEdit} initial={{ title: p.title, subtitle: p.subtitle ?? "", slug: p.slug, shortDescription: p.shortDescription ?? "", description: p.description ?? "" }} />
            </Panel>
          ) : null}

          {step.key === "cover" ? (
            <Panel title="Cover" description="Without an image, the store draws a cover from the title and spine colour.">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col items-start gap-3">
                  {data.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.coverUrl} alt={p.cover?.alt ?? ""} className="aspect-2/3 w-full max-w-48 rounded-cover object-cover shadow-2" />
                  ) : (
                    <div className="flex aspect-2/3 w-full max-w-48 items-end rounded-cover p-4 shadow-2" style={{ backgroundColor: p.spineColor }}>
                      <span className="font-serif text-h4 text-fg-on-ink">{p.title}</span>
                    </div>
                  )}
                  {data.coverUrl && canEdit ? (
                    <ActionButton action={removeCoverAction.bind(null, id)} variant="ghost" confirm={{ title: "Remove the cover?", description: "The store will show a generated cover instead.", confirmLabel: "Remove" }}>
                      Remove cover
                    </ActionButton>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="md:col-span-2">
                    <UploadForm productId={id} kind="cover" accept="image/png,image/jpeg,image/webp" hint={`${UPLOAD_RULES.cover.label}. Portrait 2:3 works best (for example 1200 × 1800).`} buttonLabel={data.coverUrl ? "Replace cover" : "Upload cover"} fields={[{ name: "alt", label: "Alt text", defaultValue: p.cover?.alt ?? "" }]} />
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}

          {step.key === "file" ? (
            <>
              <Panel title="Deliverable file" description="Stored privately. Customers only reach it through signed, logged downloads after purchase.">
                {current ? (
                  <p className="mb-4 text-body-sm text-fg-secondary">
                    Customers currently receive <strong className="text-fg">v{current.version}</strong>
                    {current.releasedAt ? `, released ${fmtDate(current.releasedAt)}` : ""}.
                  </p>
                ) : null}
                {canEdit ? (
                  <UploadForm
                    productId={id}
                    kind="version"
                    accept="application/pdf,application/zip"
                    hint={`${UPLOAD_RULES.deliverable.label}. Uploading creates a draft version; ${current ? "release it to send owners an update." : "it is released when you publish."}`}
                    buttonLabel="Upload as new version"
                    fields={[
                      { name: "version", label: "Version", defaultValue: nextVersionLabel(p.versions.filter((v) => v.status !== "draft").map((v) => v.version)), required: true },
                      { name: "changelog", label: "What changed", defaultValue: current ? "" : "Initial release.", multiline: true },
                    ]}
                  />
                ) : null}
              </Panel>
              <Panel title="Versions" flush>
                <Table>
                  <thead>
                    <tr>
                      <Th>Version</Th>
                      <Th>File</Th>
                      <Th>Status</Th>
                      <Th>Owners on it</Th>
                      <Th>Created</Th>
                      <Th>
                        <span className="sr-only">Actions</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.versions.length ? (
                      p.versions.map((v) => (
                        <tr key={v.id}>
                          <Td className="font-semibold">
                            v{v.version}
                            {v.changelog ? <p className="max-w-xs truncate text-caption font-normal text-fg-muted">{v.changelog}</p> : null}
                          </Td>
                          <Td className="text-fg-secondary">
                            {v.files.map((f) => (
                              <span key={f.id} className="block">
                                {f.fileName} · {fmtBytes(f.sizeBytes)}
                                {f.pageCount ? ` · ${f.pageCount} pages` : ""}
                              </span>
                            ))}
                          </Td>
                          <Td>
                            <StatusChip value={v.id === p.currentVersionId ? "published" : v.status} label={v.id === p.currentVersionId ? "Current" : undefined} />
                          </Td>
                          <Td className="tabular-nums">{v._count.libraryItems}</Td>
                          <Td className="text-fg-muted">{fmtDateTime(v.createdAt)}</Td>
                          <Td className="text-right">
                            {v.status === "draft" && p.currentVersionId && canPublish ? (
                              <ActionButton action={publishVersionAction.bind(null, id, v.id)} variant="primary" confirm={{ title: `Release v${v.version}?`, description: "It becomes the file customers download. Owners of earlier versions see “Update available”.", confirmLabel: "Release" }}>
                                Release
                              </ActionButton>
                            ) : null}
                            {v.status === "draft" && canEdit ? (
                              <ActionButton action={discardVersionAction.bind(null, id, v.id)} variant="ghost" confirm={{ title: "Discard this draft version?", description: "The uploaded file is removed from this product.", confirmLabel: "Discard", destructive: true }}>
                                Discard
                              </ActionButton>
                            ) : null}
                          </Td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <Td colSpan={6} className="py-8 text-center text-fg-muted">
                          No file yet. Upload the PDF customers will receive.
                        </Td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Panel>
            </>
          ) : null}

          {step.key === "previews" ? (
            <Panel title="Preview pages" description="Public sample pages. Every image is re-encoded and watermarked “KRM.lib · Preview” — never upload the paid file itself.">
              {data.previews.length ? (
                <ul className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {data.previews.map((pv) => (
                    <li key={pv.id} className="flex flex-col gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pv.url} alt={pv.label ?? "Preview"} className="aspect-3/4 w-full rounded-sm border border-line object-cover" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-caption text-fg-secondary">{pv.label}</span>
                        {canEdit ? (
                          <ActionButton action={deletePreviewAction.bind(null, id, pv.id)} variant="ghost" size="icon-sm" confirm={{ title: "Remove this preview?", description: "It disappears from the product page.", confirmLabel: "Remove", destructive: true }}>
                            <Trash2 aria-label="Remove preview" />
                          </ActionButton>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canEdit && data.previews.length < 8 ? (
                <UploadForm productId={id} kind="preview" accept="image/png,image/jpeg,image/webp" hint={`${UPLOAD_RULES.preview.label}. Export a page or two from the PDF as images.`} buttonLabel="Add preview page" fields={[{ name: "label", label: "Label", defaultValue: data.previews.length === 0 ? "Sample pages" : data.previews.length === 1 ? "Chapter example" : "Checklist example" }]} />
              ) : null}
            </Panel>
          ) : null}

          {step.key === "metadata" ? (
            <Panel title="Metadata">
              <MetadataForm
                productId={id}
                nextHref={nextHref}
                readOnly={!canEdit}
                authors={data.authors}
                initial={{
                  publisher: p.publisher ?? "",
                  language: p.language,
                  level: p.level ?? "",
                  spineColor: p.spineColor,
                  authorId: p.authors[0]?.author.id ?? "",
                  tags: p.tags.map((t) => t.tag.name).join(", "),
                  isFeatured: p.isFeatured,
                  isBestseller: p.isBestseller,
                }}
              />
            </Panel>
          ) : null}

          {step.key === "pricing" ? (
            <Panel title="Pricing">
              <PricingForm
                productId={id}
                nextHref={nextHref}
                readOnly={!canEdit}
                free={p.type === "free_resource"}
                initial={{ inr: minorToMajorString(price("INR")?.amountMinor), inrCompare: minorToMajorString(price("INR")?.compareAtMinor), usd: minorToMajorString(price("USD")?.amountMinor), usdCompare: minorToMajorString(price("USD")?.compareAtMinor) }}
              />
            </Panel>
          ) : null}

          {step.key === "categories" ? (
            <Panel title="Categories">
              <CategoriesForm productId={id} nextHref={nextHref} readOnly={!canEdit} categories={data.categories} initial={{ primaryCategoryId: p.primaryCategoryId ?? "", categoryIds: p.categories.map((c) => c.categoryId) }} />
            </Panel>
          ) : null}

          {step.key === "seo" ? (
            <Panel title="SEO">
              <SeoForm productId={id} nextHref={nextHref} readOnly={!canEdit} initial={{ seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" }} fallbackTitle={`${p.title} · KRM.lib`} fallbackDescription={p.shortDescription ?? ""} />
            </Panel>
          ) : null}

          {step.key === "content" ? (
            <Panel title={isBundle ? "Bundle contents & FAQ" : "Contents & FAQ"}>
              <ContentForm
                productId={id}
                nextHref={nextHref}
                readOnly={!canEdit}
                initial={{
                  toc: p.tocEntries.map((t) => (t.pageNumber ? `${t.title} | ${t.pageNumber}` : t.title)).join("\n"),
                  inside: p.insideItems.map((t) => (t.description ? `${t.title} — ${t.description}` : t.title)).join("\n"),
                  faqs: p.faqs.map((f) => ({ question: f.question, answer: f.answer })),
                }}
                bundle={isBundle ? { candidates: data.bundleCandidates, selected: p.bundleItems.map((b) => b.productId) } : undefined}
              />
            </Panel>
          ) : null}

          {step.key === "review" ? (
            <>
              <Panel title="Publish checklist" description={missing.length ? `${missing.length} required step${missing.length === 1 ? "" : "s"} left before this can be published.` : p.status === "published" ? "Live on the store." : "Everything required is in place."}>
                <ul className="flex flex-col divide-y divide-line">
                  {checks.map((c) => (
                    <li key={c.key} className="flex items-center gap-3 py-2 text-body-sm">
                      {c.ok ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="Done" /> : c.required ? <CircleAlert className="size-4 shrink-0 text-warning" aria-label="Required" /> : <CircleDashed className="size-4 shrink-0 text-fg-muted" aria-label="Optional" />}
                      <span className={cn("flex-1", c.ok ? "text-fg" : "text-fg-secondary")}>
                        {c.label}
                        {!c.required ? <span className="text-fg-muted"> (optional)</span> : null}
                      </span>
                      {!c.ok ? (
                        <Link href={`/admin/products/${id}?step=${c.step}`} className="text-label font-medium text-accent-strong hover:underline">
                          Fix
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canPublish && p.status !== "published" && p.status !== "archived" ? (
                  <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                    <ActionButton action={publishProductAction.bind(null, id)} variant="primary" size="md" confirm={missing.length ? undefined : { title: "Publish this product?", description: "It will appear on the shelf, in its categories and in search straight away.", confirmLabel: "Publish" }}>
                      Publish
                    </ActionButton>
                    {missing.length ? <span className="text-caption text-fg-muted">Publishing is blocked until the required steps are done.</span> : null}
                  </div>
                ) : null}
              </Panel>
              <Panel title="Summary">
                <dl className="grid gap-x-6 gap-y-2 text-body-sm sm:grid-cols-2">
                  {[
                    ["URL", storeHref],
                    ["Price", [price("INR"), price("USD")].filter(Boolean).map((x) => `${x!.currency} ${minorToMajorString(x!.amountMinor)}`).join(" · ") || "—"],
                    ["Delivered version", current ? `v${current.version}` : draftVersion ? `v${draftVersion.version} (released on publish)` : "—"],
                    ["Preview pages", String(p.previews.length)],
                    ["Reviews", String(p._count.reviews)],
                    ["First published", fmtDate(p.publishedAt)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
                      <dt className="text-fg-muted">{k}</dt>
                      <dd className="truncate text-right text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
