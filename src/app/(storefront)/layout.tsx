import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { getCurrentUser } from "@/modules/auth";

export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return <StorefrontShell user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}>{children}</StorefrontShell>;
}
