import { BookOpen, Download, Library, RefreshCw, ShieldCheck, Sparkles, Undo2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ProductDetail } from "@/modules/catalog";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { Price } from "@/components/commerce/Price";
import { WishlistButton } from "@/components/commerce/WishlistButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ClaimFreeButton } from "./ClaimFreeButton";

export type PurchaseState = "available" | "owned" | "updated" | "unavailable";

type PurchasePanelProps = {
  product: ProductDetail;
  state: PurchaseState;
  /** Reader link for owners (keyed by library item, never by product). */
  readHref: string | null;
  signedIn: boolean;
  wishlisted: boolean;
  refundWindowDays: number;
};

const trust: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Download, title: "Instant Download", body: "Access right after your payment is confirmed" },
  { icon: Library, title: "Lifetime Access", body: "Kept in your library and re-downloadable" },
  { icon: RefreshCw, title: "Regular Updates", body: "New versions at no extra cost" },
  { icon: ShieldCheck, title: "Secure Payment", body: "Razorpay (India) and Stripe (global)" },
];

/** Sticky purchase card (DESIGN_SYSTEM §21). One component covers every product-page state. */
export function PurchasePanel({ product, state, readHref, signedIn, wishlisted, refundWindowDays }: PurchasePanelProps) {
  const price = product.price;
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-2">
      {state === "owned" || state === "updated" ? (
        <>
          <div className="flex items-center gap-2">
            <Badge tone="ink">In your library</Badge>
            {state === "updated" ? <Badge tone="accent">Update available</Badge> : null}
          </div>
          <p className="text-body-sm text-fg-secondary">
            {state === "updated"
              ? `Version ${product.version?.version} is out. Download the latest file from your library at no cost.`
              : "You already own this. Read it in the KRM reader or download it any time."}
          </p>
          {readHref ? (
            <Button asChild size="lg" block>
              <Link href={readHref}>
                <BookOpen /> Read now
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary" block>
            <Link href="/account/downloads">
              <Download /> {state === "updated" ? "Download latest version" : "Go to Downloads"}
            </Link>
          </Button>
        </>
      ) : state === "unavailable" || !price ? (
        <>
          <p className="font-serif text-h3 text-fg">Currently unavailable</p>
          <p className="text-body-sm text-fg-secondary">This product isn&apos;t available for purchase in your currency right now.</p>
          <WishlistButton productId={product.id} title={product.title} initial={wishlisted} signedIn={signedIn} variant="outline" />
        </>
      ) : price.isFree ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-price text-fg">Free</span>
            <Badge tone="success">Free resource</Badge>
          </div>
          <ClaimFreeButton productId={product.id} title={product.title} signedIn={signedIn} />
          <p className="text-caption text-fg-muted">Adds this resource to your library so you can download it any time.</p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <Price price={price} size="lg" />
            <p className="text-caption text-fg-muted">One-time purchase. Lifetime access. Price includes applicable taxes.</p>
          </div>
          <div className="flex flex-col gap-3">
            <AddToCartButton productId={product.id} title={product.title} mode="buy" size="lg" block />
            <div className="flex gap-3">
              <AddToCartButton productId={product.id} title={product.title} size="lg" className="min-w-0 flex-1" />
              <WishlistButton productId={product.id} title={product.title} initial={wishlisted} signedIn={signedIn} variant="outline" className="size-12 shrink-0" />
            </div>
          </div>
        </>
      )}
      <ul className="flex flex-col gap-3 border-t border-line pt-5">
        {trust.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
            <div>
              <p className="text-label font-semibold text-fg">{title}</p>
              <p className="text-caption text-fg-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      {refundWindowDays > 0 ? (
        <p className="flex items-center justify-center gap-2 border-t border-line pt-4 text-caption text-fg-secondary">
          <Undo2 className="size-3.5" aria-hidden /> {refundWindowDays}-day refund window —{" "}
          <Link href="/refund-policy" className="underline underline-offset-2">
            policy
          </Link>
        </p>
      ) : null}
      {product.isNew ? (
        <p className="flex items-center justify-center gap-2 text-caption text-fg-muted">
          <Sparkles className="size-3.5" aria-hidden /> New in the library
        </p>
      ) : null}
    </div>
  );
}
