"use client";

import { Archive, ArchiveRestore, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

/** Favourite / archive toggles for a library item (API §3.6). */
export function LibraryActions({ libraryItemId, favorite, archived }: { libraryItemId: string; favorite: boolean; archived: boolean }) {
  const router = useRouter();
  const [fav, setFav] = useState(favorite);
  const [arch, setArch] = useState(archived);
  const [pending, startTransition] = useTransition();

  const toggle = (flag: "favorite" | "archive", next: boolean) =>
    startTransition(async () => {
      const res = await fetch(`/api/v1/account/library/${libraryItemId}/${flag}`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) {
        toast({ title: "Couldn't update your library", description: "Please try again.", tone: "error" });
        return;
      }
      if (flag === "favorite") setFav(next);
      else setArch(next);
      toast({ title: flag === "favorite" ? (next ? "Added to favourites" : "Removed from favourites") : next ? "Moved to archive" : "Restored to your shelf" });
      router.refresh();
    });

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="icon" aria-pressed={fav} aria-label={fav ? "Remove from favourites" : "Add to favourites"} disabled={pending} onClick={() => toggle("favorite", !fav)}>
        <Heart className={cn(fav && "fill-terracotta text-terracotta")} />
      </Button>
      <Button variant="secondary" size="icon" aria-label={arch ? "Restore from archive" : "Archive"} disabled={pending} onClick={() => toggle("archive", !arch)}>
        {arch ? <ArchiveRestore /> : <Archive />}
      </Button>
    </div>
  );
}
