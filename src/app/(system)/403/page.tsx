import type { Metadata } from "next";
import { SystemState } from "@/components/system/SystemState";

export const metadata: Metadata = { title: "Access forbidden", robots: { index: false } };

export default function Page() {
  return <SystemState variant="forbidden" />;
}
