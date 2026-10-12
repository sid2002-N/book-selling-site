import type { Metadata } from "next";
import { CouponForm, emptyCoupon } from "../CouponForm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/modules/admin";
import { couponScopeOptions } from "@/modules/backoffice";

export const metadata: Metadata = { title: "New coupon" };

export default async function NewCouponPage() {
  await requireAdminPage("marketing.manage", "/admin/coupons/new");
  const options = await couponScopeOptions();
  return (
    <>
      <PageHeader title="New coupon" back={{ href: "/admin/coupons", label: "Coupons" }} />
      <Panel className="max-w-3xl">
        <CouponForm id={null} initial={emptyCoupon} locked={false} options={options} />
      </Panel>
    </>
  );
}
