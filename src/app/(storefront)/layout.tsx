import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { getCurrentUser } from "@/modules/auth";
import { cartCount } from "@/modules/cart";
import { CurrencySwitcher } from "@/components/commerce/CurrencySwitcher";
import { getDisplayCurrency } from "@/modules/pricing";

export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const [user, count, currency] = await Promise.all([getCurrentUser(), cartCount(), getDisplayCurrency()]);
  return (
    <StorefrontShell user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null} cartCount={count} footerUtility={<CurrencySwitcher current={currency} tone="dark" />}>
      {children}
    </StorefrontShell>
  );
}
