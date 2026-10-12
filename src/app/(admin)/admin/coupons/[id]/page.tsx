import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CouponForm } from "../CouponForm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { isAppError } from "@/lib/errors";
import { requireAdminPage } from "@/modules/admin";
import { couponScopeOptions, getCoupon, minorToMajorString } from "@/modules/backoffice";

export const metadata: Metadata = { title: "Edit coupon" };

/** datetime-local value in IST, matching how admin dates are displayed. */
function localInput(d: Date | null): string {
  if (!d) return "";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

export default async function EditCouponPage({ params }: PageProps<"/admin/coupons/[id]">) {
  const { id } = await params;
  await requireAdminPage("marketing.manage", `/admin/coupons/${id}`);
  const [c, options] = await Promise.all([
    getCoupon(id).catch((error) => {
      if (isAppError(error) && error.code === "NOT_FOUND") notFound();
      throw error;
    }),
    couponScopeOptions(),
  ]);
  const applies = c.appliesTo as { scope?: string; ids?: string[] };
  return (
    <>
      <PageHeader title={c.code} description={`Used ${c._count.redemptions} time${c._count.redemptions === 1 ? "" : "s"}`} back={{ href: "/admin/coupons", label: "Coupons" }} />
      <Panel className="max-w-3xl">
        <CouponForm
          id={c.id}
          locked={c._count.redemptions > 0}
          options={options}
          initial={{
            code: c.code,
            description: c.description ?? "",
            type: c.type,
            value: c.type === "percent" ? String(c.value) : minorToMajorString(c.value),
            currency: c.currency ?? "",
            minOrder: minorToMajorString(c.minOrderMinor),
            maxDiscount: minorToMajorString(c.maxDiscountMinor),
            usageLimit: c.usageLimit ? String(c.usageLimit) : "",
            perCustomerLimit: c.perCustomerLimit ? String(c.perCustomerLimit) : "",
            startsAt: localInput(c.startsAt),
            endsAt: localInput(c.endsAt),
            isActive: c.isActive,
            isPublic: c.isPublic,
            scope: applies.scope === "categories" || applies.scope === "products" ? applies.scope : "all",
            scopeIds: applies.ids ?? [],
          }}
        />
      </Panel>
    </>
  );
}
