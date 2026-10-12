"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { saveProductSectionAction } from "../../actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Checkbox, Switch } from "@/components/ui/Choice";
import { Field, Input, Label, Textarea } from "@/components/ui/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import type { FormState } from "@/lib/form-state";
import type { ProductSection } from "@/modules/backoffice";

type Fields = Record<string, string>;

function useSection(productId: string, nextHref?: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({ status: "idle" });
  function save(input: ProductSection, advance: boolean) {
    start(async () => {
      const result = await saveProductSectionAction(productId, input);
      setState(result);
      if (result.status === "success") {
        toast({ title: result.message ?? "Saved", tone: "success" });
        if (advance && nextHref) router.push(nextHref);
        else router.refresh();
      }
    });
  }
  return { pending, state, fields: (state.fields ?? {}) as Fields, save };
}

function SectionShell({ state, pending, nextHref, onSubmit, children, readOnly }: { state: FormState; pending: boolean; nextHref?: string; onSubmit: (advance: boolean) => void; children: ReactNode; readOnly?: boolean }) {
  const advance = useRef(false);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(advance.current);
        advance.current = false;
      }}
    >
      {state.status === "error" ? <FormAlert>{state.message}</FormAlert> : null}
      <fieldset disabled={readOnly} className="flex flex-col gap-5">
        {children}
      </fieldset>
      {readOnly ? null : (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button type="submit" size="sm" loading={pending}>
            Save
          </Button>
          {nextHref ? (
            <Button type="submit" size="sm" variant="secondary" disabled={pending} onClick={() => (advance.current = true)}>
              Save & continue
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}

type Common = { productId: string; nextHref?: string; readOnly?: boolean };

export function DetailsForm({ productId, nextHref, readOnly, initial }: Common & { initial: { title: string; subtitle: string; slug: string; shortDescription: string; description: string } }) {
  const s = useSection(productId, nextHref);
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <SectionShell {...s} nextHref={nextHref} readOnly={readOnly} onSubmit={(adv) => s.save({ section: "details", data: v }, adv)}>
      <Field label="Title" error={s.fields.title}>
        {(ids) => <Input id={ids.id} value={v.title} onChange={set("title")} maxLength={160} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
      </Field>
      <Field label="Subtitle" optional error={s.fields.subtitle}>
        {(ids) => <Input id={ids.id} value={v.subtitle} onChange={set("subtitle")} maxLength={200} aria-describedby={ids.describedBy} />}
      </Field>
      <Field label="URL slug" hint="Lowercase letters, numbers and hyphens. Changing it changes the product's address." error={s.fields.slug}>
        {(ids) => <Input id={ids.id} value={v.slug} onChange={set("slug")} maxLength={80} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
      </Field>
      <Field label="Short description" hint={`Shown on cards and search results. ${v.shortDescription.length}/280`} error={s.fields.shortDescription}>
        {(ids) => <Textarea id={ids.id} rows={2} value={v.shortDescription} onChange={set("shortDescription")} maxLength={280} aria-describedby={ids.describedBy} />}
      </Field>
      <Field label="Full description" hint="Who it's for, what it covers and how it's structured. Blank lines start new paragraphs." error={s.fields.description}>
        {(ids) => <Textarea id={ids.id} rows={9} value={v.description} onChange={set("description")} maxLength={8000} aria-describedby={ids.describedBy} />}
      </Field>
    </SectionShell>
  );
}

export function MetadataForm({ productId, nextHref, readOnly, initial, authors }: Common & { initial: { publisher: string; language: string; level: string; spineColor: string; authorId: string; tags: string; isFeatured: boolean; isBestseller: boolean }; authors: { id: string; name: string }[] }) {
  const s = useSection(productId, nextHref);
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <SectionShell {...s} nextHref={nextHref} readOnly={readOnly} onSubmit={(adv) => s.save({ section: "metadata", data: { ...v, authorId: v.authorId || null } }, adv)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Author" optional>
          {(ids) => (
            <Select value={v.authorId || "none"} onValueChange={(x) => setV({ ...v, authorId: x === "none" ? "" : x })}>
              <SelectTrigger id={ids.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No author shown</SelectItem>
                {authors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Publisher" optional>
          {(ids) => <Input id={ids.id} value={v.publisher} onChange={set("publisher")} maxLength={120} />}
        </Field>
        <Field label="Language code" hint="For example en or hi." error={s.fields.language}>
          {(ids) => <Input id={ids.id} value={v.language} onChange={set("language")} maxLength={12} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Level" optional hint="For example Beginner.">
          {(ids) => <Input id={ids.id} value={v.level} onChange={set("level")} maxLength={40} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Spine colour" hint="Used on the shelf and for the generated cover." error={s.fields.spineColor}>
          {(ids) => (
            <div className="flex items-center gap-2">
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v.spineColor) ? v.spineColor : "#2F4A3A"} onChange={set("spineColor")} className="h-11 w-12 cursor-pointer rounded-sm border border-line bg-surface p-1" aria-label="Pick spine colour" />
              <Input id={ids.id} value={v.spineColor} onChange={set("spineColor")} maxLength={7} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />
            </div>
          )}
        </Field>
        <Field label="Tags" optional hint="Comma separated, up to 12.">
          {(ids) => <Input id={ids.id} value={v.tags} onChange={set("tags")} maxLength={400} aria-describedby={ids.describedBy} />}
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3 text-body-sm text-fg">
          <Switch checked={v.isFeatured} onCheckedChange={(x) => setV({ ...v, isFeatured: x })} aria-label="Featured" />
          Featured on the home page
        </label>
        <label className="flex items-center gap-3 text-body-sm text-fg">
          <Switch checked={v.isBestseller} onCheckedChange={(x) => setV({ ...v, isBestseller: x })} aria-label="Bestseller badge" />
          Bestseller badge
        </label>
      </div>
    </SectionShell>
  );
}

export function SeoForm({ productId, nextHref, readOnly, initial, fallbackTitle, fallbackDescription }: Common & { initial: { seoTitle: string; seoDescription: string }; fallbackTitle: string; fallbackDescription: string }) {
  const s = useSection(productId, nextHref);
  const [v, setV] = useState(initial);
  return (
    <SectionShell {...s} nextHref={nextHref} readOnly={readOnly} onSubmit={(adv) => s.save({ section: "seo", data: v }, adv)}>
      <Field label="SEO title" optional hint={`${v.seoTitle.length}/70 · Falls back to “${fallbackTitle}”.`} error={s.fields.seoTitle}>
        {(ids) => <Input id={ids.id} value={v.seoTitle} onChange={(e) => setV({ ...v, seoTitle: e.target.value })} maxLength={70} aria-describedby={ids.describedBy} />}
      </Field>
      <Field label="Meta description" optional hint={`${v.seoDescription.length}/170 · Falls back to the short description.`} error={s.fields.seoDescription}>
        {(ids) => <Textarea id={ids.id} rows={3} value={v.seoDescription} onChange={(e) => setV({ ...v, seoDescription: e.target.value })} maxLength={170} aria-describedby={ids.describedBy} />}
      </Field>
      <div className="rounded-sm border border-line bg-canvas p-4">
        <p className="text-caption text-fg-muted">Search result preview</p>
        <p className="mt-1 text-body font-semibold text-plum">{v.seoTitle || fallbackTitle}</p>
        <p className="text-body-sm text-fg-secondary">{v.seoDescription || fallbackDescription || "Add a short description so search engines have something to show."}</p>
      </div>
    </SectionShell>
  );
}

export function PricingForm({ productId, nextHref, readOnly, initial, free }: Common & { initial: { inr: string; inrCompare: string; usd: string; usdCompare: string }; free: boolean }) {
  const s = useSection(productId, nextHref);
  const [v, setV] = useState(free ? { ...initial, inr: initial.inr || "0", usd: initial.usd || "0" } : initial);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <SectionShell {...s} nextHref={nextHref} readOnly={readOnly} onSubmit={(adv) => s.save({ section: "pricing", data: v }, adv)}>
      <p className="text-body-sm text-fg-muted">
        {free ? "Free resources are priced at 0 in both currencies; customers still claim them into their library." : "Each currency has its own price — there's no automatic conversion. Compare-at prices show as a strikethrough discount."}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (₹ INR)" error={s.fields.inr}>
          {(ids) => <Input id={ids.id} inputMode="decimal" value={v.inr} onChange={set("inr")} readOnly={free} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
        </Field>
        <Field label="Compare-at (₹ INR)" optional error={s.fields.inrCompare}>
          {(ids) => <Input id={ids.id} inputMode="decimal" value={v.inrCompare} onChange={set("inrCompare")} disabled={free} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
        </Field>
        <Field label="Price ($ USD)" error={s.fields.usd}>
          {(ids) => <Input id={ids.id} inputMode="decimal" value={v.usd} onChange={set("usd")} readOnly={free} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
        </Field>
        <Field label="Compare-at ($ USD)" optional error={s.fields.usdCompare}>
          {(ids) => <Input id={ids.id} inputMode="decimal" value={v.usdCompare} onChange={set("usdCompare")} disabled={free} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
        </Field>
      </div>
    </SectionShell>
  );
}

export function CategoriesForm({ productId, nextHref, readOnly, categories, initial }: Common & { categories: { id: string; name: string; isActive: boolean }[]; initial: { primaryCategoryId: string; categoryIds: string[] } }) {
  const s = useSection(productId, nextHref);
  const [primary, setPrimary] = useState(initial.primaryCategoryId);
  const [extra, setExtra] = useState<Set<string>>(new Set(initial.categoryIds));
  if (!categories.length) return <p className="text-body-sm text-fg-muted">Create a category first under Catalog → Categories.</p>;
  return (
    <SectionShell {...s} nextHref={nextHref} readOnly={readOnly} onSubmit={(adv) => s.save({ section: "categories", data: { primaryCategoryId: primary, categoryIds: [...extra].filter((x) => x !== primary) } }, adv)}>
      <Field label="Primary category" hint="Decides the shelf row and breadcrumb." error={s.fields.primaryCategoryId}>
        {(ids) => (
          <Select value={primary || undefined} onValueChange={setPrimary}>
            <SelectTrigger id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid}>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? "" : " (hidden)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-label font-medium text-fg">Also list under</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories
            .filter((c) => c.id !== primary)
            .map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-body-sm text-fg">
                <Checkbox
                  checked={extra.has(c.id)}
                  onCheckedChange={(x) => {
                    const next = new Set(extra);
                    if (x) next.add(c.id);
                    else next.delete(c.id);
                    setExtra(next);
                  }}
                />
                {c.name}
              </label>
            ))}
        </div>
      </fieldset>
    </SectionShell>
  );
}

export function ContentForm({
  productId,
  nextHref,
  readOnly,
  initial,
  bundle,
}: Common & {
  initial: { toc: string; inside: string; faqs: { question: string; answer: string }[] };
  bundle?: { candidates: { id: string; title: string; status: string }[]; selected: string[] };
}) {
  const s = useSection(productId, nextHref);
  const [toc, setToc] = useState(initial.toc);
  const [inside, setInside] = useState(initial.inside);
  const [faqs, setFaqs] = useState(initial.faqs.length ? initial.faqs : [{ question: "", answer: "" }]);
  const [items, setItems] = useState<Set<string>>(new Set(bundle?.selected ?? []));
  return (
    <SectionShell
      {...s}
      nextHref={nextHref}
      readOnly={readOnly}
      onSubmit={(adv) => s.save({ section: "content", data: { toc, inside, faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()), ...(bundle ? { bundleProductIds: [...items] } : {}) } }, adv)}
    >
      {bundle ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-label font-medium text-fg">Products in this bundle</legend>
          <p className="text-caption text-fg-muted">Buyers get every selected product in their library. Pick at least two.</p>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-sm border border-line p-3 sm:grid-cols-2">
            {bundle.candidates.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-body-sm text-fg">
                <Checkbox
                  checked={items.has(c.id)}
                  onCheckedChange={(x) => {
                    const next = new Set(items);
                    if (x) next.add(c.id);
                    else next.delete(c.id);
                    setItems(next);
                  }}
                />
                <span className="truncate">{c.title}</span>
                {c.status !== "published" ? <span className="text-caption text-fg-muted">({c.status})</span> : null}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <Field label="Table of contents" optional hint="One entry per line. Add a page number after a bar: “Getting started | 3”.">
            {(ids) => <Textarea id={ids.id} rows={8} value={toc} onChange={(e) => setToc(e.target.value)} className="font-mono text-body-sm" aria-describedby={ids.describedBy} />}
          </Field>
          <Field label="What's inside" optional hint="One highlight per line: “Templates — 12 ready-to-use pages”.">
            {(ids) => <Textarea id={ids.id} rows={5} value={inside} onChange={(e) => setInside(e.target.value)} aria-describedby={ids.describedBy} />}
          </Field>
        </>
      )}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-label font-medium text-fg">FAQ</legend>
        {faqs.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-sm border border-line p-3">
            <div className="flex items-center gap-2">
              <Label htmlFor={`faq-q-${i}`} className="sr-only">
                Question {i + 1}
              </Label>
              <Input id={`faq-q-${i}`} placeholder={`Question ${i + 1}`} value={f.question} maxLength={200} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove question ${i + 1}`} onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
            <Label htmlFor={`faq-a-${i}`} className="sr-only">
              Answer {i + 1}
            </Label>
            <Textarea id={`faq-a-${i}`} rows={2} placeholder="Answer" value={f.answer} maxLength={1200} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
          </div>
        ))}
        {faqs.length < 20 ? (
          <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
            <Plus /> Add question
          </Button>
        ) : null}
      </fieldset>
    </SectionShell>
  );
}

/** Multipart upload to the admin uploads route (server sniffs type, caps size, audits). */
export function UploadForm({
  productId,
  kind,
  accept,
  hint,
  buttonLabel,
  fields,
}: {
  productId: string;
  kind: "cover" | "preview" | "version";
  accept: string;
  hint: string;
  buttonLabel: string;
  fields?: { name: string; label: string; defaultValue?: string; required?: boolean; multiline?: boolean }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file first.");
      return;
    }
    fd.set("kind", kind);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/admin/products/${productId}/uploads`, { method: "POST", body: fd }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { error?: { message: string; fields?: Record<string, string> } } | null;
    setBusy(false);
    if (!res?.ok) {
      setError(json?.error?.fields ? Object.values(json.error.fields)[0]! : (json?.error?.message ?? "The upload failed. Check your connection and try again."));
      return;
    }
    toast({ title: "Uploaded", tone: "success" });
    formRef.current?.reset();
    setFileName(null);
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-canvas px-4 py-8 text-center hover:bg-canvas-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
        <Upload className="size-6 text-fg-muted" aria-hidden />
        <span className="text-body-sm font-semibold text-fg">{fileName ?? "Choose a file"}</span>
        <span className="text-caption text-fg-muted">{hint}</span>
        <input type="file" name="file" accept={accept} className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
      </label>
      {fields?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.name} label={f.label} optional={!f.required} className={f.multiline ? "sm:col-span-2" : undefined}>
              {(ids) => (f.multiline ? <Textarea id={ids.id} name={f.name} rows={2} defaultValue={f.defaultValue} maxLength={1000} /> : <Input id={ids.id} name={f.name} defaultValue={f.defaultValue} required={f.required} maxLength={60} />)}
            </Field>
          ))}
        </div>
      ) : null}
      <div>
        <Button type="submit" size="sm" loading={busy}>
          {buttonLabel}
        </Button>
      </div>
    </form>
  );
}
