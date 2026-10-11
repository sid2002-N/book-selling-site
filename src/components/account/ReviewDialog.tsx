"use client";

import { PenLine, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Existing = { rating: number; title: string | null; body: string } | null;

/** Write / edit review (sheet "Customer Dashboard"): 1–5 stars, optional title, ≤500 chars. */
export function ReviewDialog({ productId, productTitle, existing, trigger = "button" }: { productId: string; productTitle: string; existing: Existing; trigger?: "button" | "link" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) {
      setFields({ rating: "Choose a rating from 1 to 5 stars." });
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    const res = await fetch("/api/v1/account/reviews", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, rating, title: title || null, body }) });
    const json = (await res.json().catch(() => null)) as { data?: { status: string }; error?: { message: string; fields?: Record<string, string> } } | null;
    setBusy(false);
    if (!res.ok) {
      if (json?.error?.fields) setFields(json.error.fields);
      setError(json?.error?.message ?? "We couldn't save your review.");
      return;
    }
    setOpen(false);
    toast({
      title: existing ? "Review updated" : "Thanks for your review!",
      description: json?.data?.status === "pending" ? "It will appear on the product page once our team has checked it." : "It's now live on the product page.",
      tone: "success",
    });
    router.refresh();
  }

  const shown = hover || rating;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger === "link" ? (
          <Button variant="ghost" size="sm">
            <PenLine /> {existing ? "Edit" : "Write a review"}
          </Button>
        ) : (
          <Button variant="secondary">
            <PenLine /> {existing ? "Edit your review" : "Write a review"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={existing ? "Edit your review" : "Write a review"} description={productTitle}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error ? <FormAlert>{error}</FormAlert> : null}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label font-medium text-fg">Your rating</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  className="rounded-sm p-1 text-accent focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <Star className={cn("size-7", n <= shown ? "fill-accent" : "fill-transparent text-line-strong")} aria-hidden />
                </button>
              ))}
            </div>
            {fields.rating ? <p className="text-caption text-error">{fields.rating}</p> : null}
          </fieldset>
          <Field label="Title" optional error={fields.title}>
            {(ids) => <Input id={ids.id} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
          </Field>
          <Field label="Your review" hint={`${body.length}/500`} error={fields.body}>
            {(ids) => <Textarea id={ids.id} rows={5} value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} aria-describedby={ids.describedBy} aria-invalid={ids.invalid} />}
          </Field>
          <p className="text-caption text-fg-muted">Reviews are checked by our team before they appear. Please keep it honest and about the content.</p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {existing ? "Save changes" : "Submit review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
