"use client";

import { useEffect } from "react";
import { StorefrontShell } from "@/components/layout/StorefrontShell";
import { SystemState } from "@/components/system/SystemState";

/** Route-level error boundary: friendly copy, technical detail stays in logs (ERROR_HANDLING). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("route_error", { digest: error.digest });
  }, [error]);

  return (
    <StorefrontShell headerVariant="compact">
      <SystemState variant="server-error" onRetry={reset}>
        {error.digest ? <p className="text-caption text-fg-muted">Reference: {error.digest}</p> : null}
      </SystemState>
    </StorefrontShell>
  );
}
