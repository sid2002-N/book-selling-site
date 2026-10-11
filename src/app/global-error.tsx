"use client";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails; must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-6">
        <main className="flex max-w-md flex-col items-start gap-4">
          <p className="font-serif text-h3">KRM.lib</p>
          <h1 className="text-h1">Something Went Wrong</h1>
          <p className="text-fg-secondary">An unexpected error occurred. Our team has been notified.</p>
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-md bg-ink px-5 text-body-sm font-medium text-fg-on-ink"
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
