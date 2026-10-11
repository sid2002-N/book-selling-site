import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { LibraryEntry } from "@/modules/library";
import { BookCover } from "@/components/library/BookCover";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Feedback";

/** "Continue Reading" card (sheet 65): cover, where you stopped, progress, one action. */
export function ContinueReadingCard({ entry }: { entry: LibraryEntry }) {
  return (
    <div className="flex gap-4 rounded-xl border border-line bg-surface p-4 shadow-1">
      <Link href={entry.href} className="w-16 shrink-0" tabIndex={-1} aria-hidden>
        <BookCover id={entry.productId} title={entry.title} coverUrl={entry.coverUrl} spineColor={entry.spineColor} sizes="64px" compact />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <Link href={entry.href} className="line-clamp-1 text-body font-semibold hover:underline">
            {entry.title}
          </Link>
          <p className="truncate text-caption text-fg-muted">{entry.lastChapter ?? (entry.lastPage && entry.totalPages ? `Page ${entry.lastPage} of ${entry.totalPages}` : entry.typeLabel)}</p>
        </div>
        <div className="mt-auto flex items-center gap-3">
          <ProgressBar value={entry.progress} label={`${entry.title} progress`} className="flex-1" />
          <span className="text-caption tabular-nums text-fg-secondary">{entry.progress}%</span>
          <Button asChild size="sm">
            <Link href={entry.readHref}>
              Continue <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
