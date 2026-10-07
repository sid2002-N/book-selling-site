import type { Metadata } from "next";
import { PdfReader } from "@/components/reader/PdfReader";
import { SystemState } from "@/components/system/SystemState";
import { isAppError } from "@/lib/errors";
import { requireUserPage } from "@/modules/auth";
import { readerManifest, type ReaderManifest } from "@/modules/reader";

export const metadata: Metadata = { title: "Reader", robots: { index: false, follow: false } };

export default async function ReadPage({ params, searchParams }: PageProps<"/read/[id]">) {
  const { id } = await params;
  const { user } = await requireUserPage(`/read/${id}`);
  let manifest: ReaderManifest | null = null;
  let problem: { title: string; message: string; href: string; label: string } | null = null;
  try {
    manifest = await readerManifest(user.id, user.emailVerified, id);
    if (!manifest.readable) problem = { title: "This title opens outside the reader", message: "It's a download-only format. Get it from your Downloads.", href: "/account/downloads", label: "Go to Downloads" };
  } catch (error) {
    if (!isAppError(error)) throw error;
    problem =
      error.code === "EMAIL_NOT_VERIFIED"
        ? { title: "Verify your email to read", message: error.userMessage, href: "/verify-email", label: "Verify email" }
        : { title: "Not in your library", message: "This title isn't on your account, or access was removed.", href: "/account/library", label: "Go to My Library" };
  }
  if (!manifest || problem) {
    return (
      <div className="container-page flex flex-1 items-center py-16">
        <SystemState variant="forbidden" layout="inline" headingLevel="h1" title={problem!.title} message={problem!.message} primary={{ label: problem!.label, href: problem!.href }} />
      </div>
    );
  }
  const requested = Number((await searchParams).page);
  return <PdfReader manifest={manifest} initialPage={Number.isInteger(requested) && requested > 0 ? requested : manifest.lastPage} />;
}
