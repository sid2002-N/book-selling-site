import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

/** Focused auth layout: no storefront navigation competing with the form. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex items-center justify-between py-5">
        <Logo />
        <Link href="/" className="flex items-center gap-1.5 text-label text-fg-secondary hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> Back to store
        </Link>
      </header>
      <main id="main" className="container-page flex flex-1 items-start justify-center pt-4 pb-16 md:items-center">
        {children}
      </main>
    </div>
  );
}
