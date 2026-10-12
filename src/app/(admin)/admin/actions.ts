"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toFormState, type FormState } from "@/lib/form-state";
import {
  archiveProduct,
  blockCustomer,
  createCoupon,
  createProduct,
  decideRefundAsAdmin,
  deletePreview,
  discardDraftVersion,
  issueRefund,
  moderateReview,
  publishProduct,
  publishVersion,
  reconcilePaymentAsAdmin,
  removeCover,
  restoreProduct,
  retryRefund,
  revokeCustomerSessions,
  saveCategory,
  setCouponArchived,
  unblockCustomer,
  unpublishProduct,
  updateCoupon,
  updateProductSection,
  type ProductSection,
} from "@/modules/backoffice";

type Input = { reason?: string };

/**
 * Admin Server Actions are thin: every service re-checks the permission and writes the audit
 * entry itself, so nothing here is trusted from the client beyond the ids and form values.
 */
async function attempt(fn: () => Promise<unknown>, message: string, paths: string[] = []): Promise<FormState> {
  try {
    await fn();
  } catch (error) {
    return toFormState(error);
  }
  for (const p of paths) revalidatePath(p);
  return { status: "success", message };
}

/** Catalogue changes reach the shelf, category pages, search and sitemap without code changes. */
const STOREFRONT = "/";
function revalidateStorefront() {
  revalidatePath(STOREFRONT, "layout");
}

// ───────────────────────────── Products ─────────────────────────────

export async function createProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const product = await createProduct({ type: String(fd.get("type") ?? "") as never, title: String(fd.get("title") ?? "") });
    id = product.id;
  } catch (error) {
    return { ...toFormState(error), values: { title: String(fd.get("title") ?? ""), type: String(fd.get("type") ?? "") } };
  }
  redirect(`/admin/products/${id}?step=details&created=1`);
}

export async function saveProductSectionAction(productId: string, input: ProductSection): Promise<FormState> {
  const result = await attempt(() => updateProductSection(productId, input), "Changes saved", [`/admin/products/${productId}`, "/admin/products"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function publishProductAction(productId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => publishProduct(productId), "Published — it's now on the shelf, in the catalogue and in search.", [`/admin/products/${productId}`, "/admin/products"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function unpublishProductAction(productId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => unpublishProduct(productId), "Unpublished — hidden from the store. Owners keep access.", [`/admin/products/${productId}`, "/admin/products"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function archiveProductAction(productId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => archiveProduct(productId), "Archived", [`/admin/products/${productId}`, "/admin/products"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function restoreProductAction(productId: string, _input: Input): Promise<FormState> {
  return attempt(() => restoreProduct(productId), "Restored as a draft", [`/admin/products/${productId}`, "/admin/products"]);
}

export async function removeCoverAction(productId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => removeCover(productId), "Cover removed — a generated cover is shown instead.", [`/admin/products/${productId}`]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function deletePreviewAction(productId: string, previewId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => deletePreview(productId, previewId), "Preview removed", [`/admin/products/${productId}`]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function publishVersionAction(productId: string, versionId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => publishVersion(productId, versionId), "Version released — owners will see “Update available”.", [`/admin/products/${productId}`]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function discardVersionAction(productId: string, versionId: string, _input: Input): Promise<FormState> {
  return attempt(() => discardDraftVersion(productId, versionId), "Draft version discarded", [`/admin/products/${productId}`]);
}

// ───────────────────────────── Categories ─────────────────────────────

export async function saveCategoryAction(id: string | null, data: { name: string; slug?: string; description?: string; position?: number; isActive?: boolean }): Promise<FormState> {
  const result = await attempt(() => saveCategory(id, data), id ? "Category saved" : "Category created", ["/admin/categories"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

// ───────────────────────────── Orders & refunds ─────────────────────────────

export async function approveRefundAction(refundId: string, orderId: string, input: Input): Promise<FormState> {
  return attempt(() => decideRefundAsAdmin(refundId, true, input.reason ?? null), "Refund approved and sent to the payment provider", [`/admin/orders/${orderId}`, "/admin/refunds"]);
}

export async function rejectRefundAction(refundId: string, orderId: string, input: Input): Promise<FormState> {
  return attempt(() => decideRefundAsAdmin(refundId, false, input.reason ?? null), "Refund rejected — the customer has been told why.", [`/admin/orders/${orderId}`, "/admin/refunds"]);
}

export async function retryRefundAction(refundId: string, orderId: string, _input: Input): Promise<FormState> {
  return attempt(() => retryRefund(refundId), "Refund sent to the payment provider again", [`/admin/orders/${orderId}`, "/admin/refunds"]);
}

export async function issueRefundAction(orderId: string, data: { amount?: string; reason: string }): Promise<FormState> {
  return attempt(() => issueRefund(orderId, data), "Refund sent to the payment provider", [`/admin/orders/${orderId}`, "/admin/refunds"]);
}

export async function reconcilePaymentAction(paymentId: string, orderId: string, _input: Input): Promise<FormState> {
  try {
    const result = await reconcilePaymentAsAdmin(paymentId);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/payments");
    return { status: "success", message: result.changed ? `Updated from the provider: ${result.status.replace(/_/g, " ")}` : "Checked with the provider — no change." };
  } catch (error) {
    return toFormState(error);
  }
}

// ───────────────────────────── Customers ─────────────────────────────

export async function blockCustomerAction(userId: string, input: Input): Promise<FormState> {
  return attempt(() => blockCustomer(userId, input.reason ?? ""), "Customer blocked and signed out everywhere", [`/admin/customers/${userId}`, "/admin/customers"]);
}

export async function unblockCustomerAction(userId: string, _input: Input): Promise<FormState> {
  return attempt(() => unblockCustomer(userId), "Customer unblocked", [`/admin/customers/${userId}`, "/admin/customers"]);
}

export async function revokeSessionsAction(userId: string, _input: Input): Promise<FormState> {
  return attempt(() => revokeCustomerSessions(userId), "Signed out of every device", [`/admin/customers/${userId}`]);
}

// ───────────────────────────── Reviews ─────────────────────────────

export async function approveReviewAction(reviewId: string, _input: Input): Promise<FormState> {
  const result = await attempt(() => moderateReview(reviewId, true, null), "Review approved and published", ["/admin/reviews"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

export async function rejectReviewAction(reviewId: string, input: Input): Promise<FormState> {
  const result = await attempt(() => moderateReview(reviewId, false, input.reason ?? null), "Review rejected", ["/admin/reviews"]);
  if (result.status === "success") revalidateStorefront();
  return result;
}

// ───────────────────────────── Coupons ─────────────────────────────

export type CouponFormData = Parameters<typeof createCoupon>[0];

export async function saveCouponAction(id: string | null, data: CouponFormData): Promise<FormState> {
  let savedId = id;
  try {
    if (id) await updateCoupon(id, data);
    else savedId = (await createCoupon(data)).id;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/coupons");
  return { status: "success", message: id ? "Coupon saved" : "Coupon created", meta: { id: savedId } };
}

export async function archiveCouponAction(id: string, archived: boolean, _input: Input): Promise<FormState> {
  return attempt(() => setCouponArchived(id, archived), archived ? "Coupon archived" : "Coupon restored", ["/admin/coupons"]);
}
