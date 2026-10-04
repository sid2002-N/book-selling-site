import type { Metadata } from "next";
import { PaymentStatusView } from "@/components/checkout/PaymentStatusView";
import { SystemState } from "@/components/system/SystemState";
import { isAppError } from "@/lib/errors";
import { getCurrentUser } from "@/modules/auth";
import { orderStatus, type OrderStatusView } from "@/modules/checkout";
import { providersFor } from "@/modules/payments";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = { title: "Order status", robots: { index: false, follow: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function CheckoutStatusPage({ searchParams }: PageProps<"/checkout/status">) {
  const sp = await searchParams;
  const orderId = one(sp.order);
  const token = one(sp.token);
  let view: OrderStatusView | null = null;
  if (orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
    try {
      view = await orderStatus({ orderId, token, refresh: true });
    } catch (error) {
      if (!isAppError(error)) throw error;
    }
  }
  if (!view) {
    return (
      <div className="container-page py-10">
        <SystemState variant="not-found" layout="inline" headingLevel="h1" title="Order not found" message="This order link is invalid or you're signed in to a different account." primary={{ label: "View my orders", href: "/account/orders" }} />
      </div>
    );
  }
  const [providers, user, supportEmail] = await Promise.all([providersFor(view.currency), getCurrentUser(), getSetting("store.supportEmail")]);
  return (
    <div className="container-page py-10 md:py-16">
      <PaymentStatusView
        initial={view}
        token={token}
        providers={providers}
        signedIn={Boolean(user)}
        supportEmail={supportEmail}
        stripeIntent={one(sp.payment_intent)}
        dismissed={one(sp.dismissed) === "1"}
      />
    </div>
  );
}
