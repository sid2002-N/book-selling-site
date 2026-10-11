import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { Gallery } from "./Gallery";

export const metadata: Metadata = { title: "Component gallery (dev)", robots: { index: false } };

/** Development-only gallery for checking components against the UIUX sheets. */
export default function ComponentGalleryPage() {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "development") notFound();
  return (
    <StorefrontShell>
      <Gallery />
    </StorefrontShell>
  );
}
