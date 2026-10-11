import { StorefrontShell } from "@/components/layout/StorefrontShell";

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell headerVariant="compact">{children}</StorefrontShell>;
}
