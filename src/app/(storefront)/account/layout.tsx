import { headers } from "next/headers";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { requireUserPage } from "@/modules/auth";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const path = (await headers()).get("x-pathname") ?? "/account";
  await requireUserPage(path);
  return (
    <div className="container-page grid gap-8 py-6 md:py-10 lg:grid-cols-12">
      <aside className="lg:col-span-3 xl:col-span-2">
        <div className="lg:sticky lg:top-24">
          <AccountSidebar />
        </div>
      </aside>
      <div className="min-w-0 lg:col-span-9 xl:col-span-10">{children}</div>
    </div>
  );
}
