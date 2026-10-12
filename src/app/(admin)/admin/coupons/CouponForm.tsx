"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCouponAction } from "../actions";
import { FormAlert } from "@/components/auth/FormAlert";
import { Button } from "@/components/ui/Button";
import { Checkbox, Switch } from "@/components/ui/Choice";
import { Field, Input } from "@/components/ui/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

export type CouponFormValues = {
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: string;
  currency: "" | "INR" | "USD";
  minOrder: string;
  maxDiscount: string;
  usageLimit: string;
  perCustomerLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isPublic: boolean;
  scope: "all" | "categories" | "products";
  scopeIds: string[];
};

/** Admin dates are entered and shown in the store timezone (IST), whatever the browser's zone. */
const fromIst = (local: string) => (local ? new Date(`${local}:00+05:30`).toISOString() : "");

export const emptyCoupon: CouponFormValues = { code: "", description: "", type: "percent", value: "", currency: "", minOrder: "", maxDiscount: "", usageLimit: "", perCustomerLimit: "1", startsAt: "", endsAt: "", isActive: true, isPublic: false, scope: "all", scopeIds: [] };

/** Coupon editor (sheet "Marketing" Create/Edit Coupon). All rules are re-validated server-side. */
export function CouponForm({ id, initial, locked, options }: { id: string | null; initial: CouponFormValues; locked: boolean; options: { categories: { id: string; name: string }[]; products: { id: string; name: string }[] } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof CouponFormValues) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const scopeList = v.scope === "categories" ? options.categories : v.scope === "products" ? options.products : [];

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await saveCouponAction(id, {
            ...v,
            currency: v.currency || undefined,
            startsAt: fromIst(v.startsAt),
            endsAt: fromIst(v.endsAt),
          });
          if (result.status === "error") {
            setError(result.message ?? "Couldn't save the coupon.");
            setFields(result.fields ?? {});
            return;
          }
          toast({ title: result.message ?? "Saved", tone: "success" });
          router.push("/admin/coupons");
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{error}</FormAlert> : null}
      {locked ? <p className="rounded-sm border border-line bg-canvas-subtle px-3 py-2 text-body-sm text-fg-secondary">This coupon has been redeemed, so its code, type, value and currency are fixed.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" hint="Customers type this at checkout." error={fields.code}>
          {(ids) => <Input id={ids.id} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} disabled={locked} maxLength={32} className="font-mono uppercase" aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Internal note" optional error={fields.description}>
          {(ids) => <Input id={ids.id} value={v.description} onChange={set("description")} maxLength={200} />}
        </Field>
        <Field label="Discount type">
          {(ids) => (
            <Select value={v.type} onValueChange={(x) => setV({ ...v, type: x as "percent" | "fixed" })} disabled={locked}>
              <SelectTrigger id={ids.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage off</SelectItem>
                <SelectItem value="fixed">Fixed amount off</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label={v.type === "percent" ? "Percent off" : "Amount off"} error={fields.value}>
          {(ids) => <Input id={ids.id} inputMode="decimal" value={v.value} onChange={set("value")} disabled={locked} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Currency" optional={v.type === "percent"} hint={v.type === "percent" ? "Only needed for amount limits; leave as Any to work in both." : "Fixed discounts apply to one currency."} error={fields.currency}>
          {(ids) => (
            <Select value={v.currency || "any"} onValueChange={(x) => setV({ ...v, currency: x === "any" ? "" : (x as "INR" | "USD") })} disabled={locked}>
              <SelectTrigger id={ids.id} aria-describedby={ids.describedBy} aria-invalid={ids.invalid}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any currency</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Minimum order" optional error={fields.minOrder}>
          {(ids) => <Input id={ids.id} inputMode="decimal" value={v.minOrder} onChange={set("minOrder")} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        {v.type === "percent" ? (
          <Field label="Maximum discount" optional error={fields.maxDiscount}>
            {(ids) => <Input id={ids.id} inputMode="decimal" value={v.maxDiscount} onChange={set("maxDiscount")} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
          </Field>
        ) : null}
        <Field label="Total uses" optional hint="Blank for unlimited." error={fields.usageLimit}>
          {(ids) => <Input id={ids.id} inputMode="numeric" value={v.usageLimit} onChange={set("usageLimit")} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Uses per customer" optional error={fields.perCustomerLimit}>
          {(ids) => <Input id={ids.id} inputMode="numeric" value={v.perCustomerLimit} onChange={set("perCustomerLimit")} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Starts (IST)" optional error={fields.startsAt}>
          {(ids) => <Input id={ids.id} type="datetime-local" value={v.startsAt} onChange={set("startsAt")} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
        <Field label="Ends (IST)" optional error={fields.endsAt}>
          {(ids) => <Input id={ids.id} type="datetime-local" value={v.endsAt} onChange={set("endsAt")} aria-invalid={ids.invalid} aria-describedby={ids.describedBy} />}
        </Field>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-label font-medium text-fg">Applies to</legend>
        <div className="flex flex-wrap gap-2">
          {(["all", "categories", "products"] as const).map((s) => (
            <Button key={s} type="button" size="sm" variant={v.scope === s ? "primary" : "secondary"} aria-pressed={v.scope === s} onClick={() => setV({ ...v, scope: s, scopeIds: [] })}>
              {s === "all" ? "Everything" : s === "categories" ? "Some categories" : "Some products"}
            </Button>
          ))}
        </div>
        {fields.scopeIds ? <p className="text-caption text-error">{fields.scopeIds}</p> : null}
        {scopeList.length ? (
          <div className="grid max-h-60 gap-2 overflow-y-auto rounded-sm border border-line p-3 sm:grid-cols-2">
            {scopeList.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-body-sm text-fg">
                <Checkbox checked={v.scopeIds.includes(o.id)} onCheckedChange={(x) => setV({ ...v, scopeIds: x ? [...v.scopeIds, o.id] : v.scopeIds.filter((i) => i !== o.id) })} />
                <span className="truncate">{o.name}</span>
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3 text-body-sm text-fg">
          <Switch checked={v.isActive} onCheckedChange={(x) => setV({ ...v, isActive: x })} aria-label="Active" />
          Active
        </label>
        <label className="flex items-center gap-3 text-body-sm text-fg">
          <Switch checked={v.isPublic} onCheckedChange={(x) => setV({ ...v, isPublic: x })} aria-label="Public" />
          Public (can be advertised)
        </label>
      </div>
      <div className="flex gap-2 border-t border-line pt-4">
        <Button type="submit" size="sm" loading={pending}>
          {id ? "Save coupon" : "Create coupon"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => router.push("/admin/coupons")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
