"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";

type SessionRow = { id: string; deviceLabel: string | null; ip: string | null; lastSeen: string; current: boolean };

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {sessions.map((s) => {
          const mobile = /iOS|Android/.test(s.deviceLabel ?? "");
          const Icon = mobile ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex items-center gap-4 px-4 py-3">
              <Icon className="size-5 text-fg-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-fg">{s.deviceLabel ?? "Unknown device"}</p>
                <p className="text-caption text-fg-muted">
                  {[s.ip, `Active ${s.lastSeen}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              {s.current ? (
                <Badge tone="success">Current</Badge>
              ) : (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => revokeSessionAction(s.id))}>
                  Sign out
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {sessions.length > 1 ? (
        <div>
          <Button variant="destructive-outline" size="sm" loading={pending} onClick={() => startTransition(() => revokeOtherSessionsAction())}>
            Sign out from all other devices
          </Button>
        </div>
      ) : null}
    </div>
  );
}
