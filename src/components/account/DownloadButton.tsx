"use client";

import { CircleAlert, Download, Lock, MailCheck, RotateCcw, TriangleAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ProgressBar } from "@/components/ui/Feedback";
import { toast } from "@/components/ui/Toast";

type Problem = { code: string; message: string; used?: number; limit?: number };

const PROBLEM: Record<string, { icon: LucideIcon; title: string; reasons?: string[] }> = {
  DOWNLOAD_LIMIT_REACHED: { icon: TriangleAlert, title: "Download limit reached" },
  DOWNLOAD_UNAUTHORIZED: { icon: Lock, title: "Unauthorized download", reasons: ["This product isn't on your account", "Access was removed after a refund", "You're signed in to a different account"] },
  FILE_UNAVAILABLE: { icon: CircleAlert, title: "File not available", reasons: ["The file is temporarily unavailable", "The product is being updated", "There's a technical issue on our side"] },
  EMAIL_NOT_VERIFIED: { icon: MailCheck, title: "Verify your email first" },
};

type Props = { libraryItemId: string; title: string; label?: string; supportEmail?: string } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className" | "block">;

/**
 * Issues a download on the server (entitlement + limit checked there) and starts it. Every
 * refusal gets its own explanation from the Download Center sheet.
 */
export function DownloadButton({ libraryItemId, title, label = "Download", supportEmail = "support@krmlib.local", ...buttonProps }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/downloads/${libraryItemId}/issue`, { method: "POST" });
      const body = (await res.json()) as { data: { url: string; external: boolean; used: number; limit: number } | null; error: { code: string; message: string } | null; meta?: Record<string, unknown> };
      if (!body.data) {
        setProblem({ code: body.error?.code ?? "FILE_UNAVAILABLE", message: body.error?.message ?? "Please try again." });
        return;
      }
      if (body.data.external) {
        window.open(body.data.url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = body.data.url;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      toast({ title: "Download starting", description: body.data.limit ? `${title} · download ${body.data.used} of ${body.data.limit}` : title, tone: "success" });
      router.refresh();
    } catch {
      setProblem({ code: "FILE_UNAVAILABLE", message: "We lost the connection. Check your internet and try again." });
    } finally {
      setBusy(false);
    }
  }

  const spec = problem ? (PROBLEM[problem.code] ?? PROBLEM.FILE_UNAVAILABLE!) : null;
  const Icon = spec?.icon ?? CircleAlert;

  return (
    <>
      <Button {...buttonProps} loading={busy} onClick={start}>
        <Download /> {label}
      </Button>
      <Dialog open={Boolean(problem)} onOpenChange={(open) => !open && setProblem(null)}>
        {problem && spec ? (
          <DialogContent title={spec.title} description={title} className="sm:max-w-md">
            <div className="flex flex-col gap-4">
              <span className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
                <Icon className="size-6" aria-hidden />
              </span>
              <p className="text-body-sm text-fg-secondary">{problem.message}</p>
              {problem.code === "DOWNLOAD_LIMIT_REACHED" ? <ProgressBar value={100} tone="error" label="Downloads used" /> : null}
              {spec.reasons ? (
                <ul className="flex flex-col gap-1 rounded-md bg-error-soft px-4 py-3 text-body-sm text-fg-secondary">
                  {spec.reasons.map((r) => (
                    <li key={r} className="flex items-center gap-2">
                      <span aria-hidden className="size-1.5 rounded-full bg-error" /> {r}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-3">
                {problem.code === "EMAIL_NOT_VERIFIED" ? (
                  <Button asChild>
                    <Link href="/verify-email">Verify email</Link>
                  </Button>
                ) : problem.code === "FILE_UNAVAILABLE" ? (
                  <Button
                    onClick={() => {
                      setProblem(null);
                      void start();
                    }}
                  >
                    <RotateCcw /> Try again
                  </Button>
                ) : (
                  <Button asChild>
                    <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Download help: ${title}`)}`}>Contact support</a>
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setProblem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
