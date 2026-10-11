import type { Metadata } from "next";
import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { SystemState } from "@/components/system/SystemState";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <StorefrontShell headerVariant="compact">
      <SystemState variant="not-found" />
    </StorefrontShell>
  );
}
