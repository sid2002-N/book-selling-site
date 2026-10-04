import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Home — hero only for now. The data-driven shelf, rails, bundles and editorial sections arrive
 * with the catalog in M3, sourced from `homepage_section` rather than hardcoded copy.
 */
export default function HomePage() {
  return (
    <section className="container-page grid gap-10 py-12 md:py-20 lg:grid-cols-2">
      <div className="flex flex-col items-start gap-6">
        <p className="text-micro font-semibold tracking-widest text-accent-strong uppercase">
          Knowledge Resource &amp; Management
        </p>
        <h1 className="text-display text-fg">
          Practical Knowledge for a <span className="text-terracotta">Better You.</span>
        </h1>
        <p className="max-w-lg text-body-lg text-fg-secondary">
          Digital books, guides and workbooks to help you learn, organize, build and grow.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/explore">
              Explore Library <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/collections">View Collections</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
