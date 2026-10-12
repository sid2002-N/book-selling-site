import { ArrowDownRight, ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { StatusBadge, type Status } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { humanize } from "./format";

/** Page header: back link, title, description and the primary action (DESIGN_SYSTEM §15). */
export function PageHeader({ title, description, back, actions, badge }: { title: ReactNode; description?: ReactNode; back?: { href: string; label: string }; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 pb-6">
      {back ? (
        <Link href={back.href} className="flex w-fit items-center gap-1.5 text-caption font-medium text-fg-muted hover:text-fg">
          <ArrowLeft className="size-3.5" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-h2 text-fg">{title}</h1>
            {badge}
          </div>
          {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Panel({ title, description, actions, children, className, flush }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("rounded-md border border-line bg-surface shadow-1", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-body-sm font-semibold text-fg">{title}</h2>
            {description ? <p className="text-caption text-fg-muted">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, change, hint, href }: { label: string; value: ReactNode; change?: number | null; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-caption font-medium text-fg-muted">{label}</p>
      <p className="font-serif text-h2 text-fg tabular-nums">{value}</p>
      <div className="flex items-center gap-2 text-caption">
        {change === null || change === undefined ? null : (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", change >= 0 ? "text-success" : "text-error")}>
            {change >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {Math.abs(change)}%<span className="sr-only">{change >= 0 ? " increase" : " decrease"}</span>
          </span>
        )}
        {hint ? <span className="text-fg-muted">{hint}</span> : null}
      </div>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-md border border-line bg-surface p-4 shadow-1";
  return href ? (
    <Link href={href} className={cn(cls, "transition-shadow duration-fast hover:shadow-2")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// ───────────────────────────── Tables (36–40px rows) ─────────────────────────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-max border-collapse text-body-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("h-9 border-b border-line bg-canvas-subtle px-3 text-left text-caption font-semibold text-fg-muted first:pl-4 last:pr-4", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("h-10 border-b border-line px-3 py-2 align-middle text-fg first:pl-4 last:pr-4", className)} {...props} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-body-sm text-fg-muted">
        {children}
      </td>
    </tr>
  );
}

/** Link tabs with counts; state lives in the URL. */
export function FilterTabs({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Filter" className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "flex h-8 shrink-0 items-center gap-2 rounded-sm px-3 text-label font-medium transition-colors duration-fast",
            t.key === active ? "bg-ink text-fg-on-ink" : "text-fg-secondary hover:bg-canvas-subtle hover:text-fg",
          )}
        >
          {t.label}
          {t.count !== undefined ? (
            <span className={cn("rounded-full px-1.5 text-micro tabular-nums", t.key === active ? "bg-ink-soft" : "bg-canvas-subtle text-fg-muted")}>{t.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** GET search form that keeps the other filters as hidden fields. */
export function SearchBar({ action, placeholder, defaultValue, keep }: { action: string; placeholder: string; defaultValue?: string; keep?: Record<string, string | undefined> }) {
  return (
    <form action={action} method="get" role="search" className="relative w-full max-w-xs">
      {Object.entries(keep ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-sm border border-line bg-surface pr-3 pl-9 text-body-sm text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
      />
    </form>
  );
}

export function DefinitionList({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body-sm sm:grid-cols-3">
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-fg-muted">{k}</dt>
          <dd className="min-w-0 break-words text-fg sm:col-span-2">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const STATUS_MAP: Record<string, Status> = {
  // product
  draft: "draft",
  in_review: "pending",
  published: "published",
  unpublished: "inactive",
  archived: "archived",
  superseded: "inactive",
  // order
  pending_payment: "pending",
  payment_pending: "processing",
  paid: "completed",
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
  partially_refunded: "refunded",
  disputed: "open",
  // payment
  created: "pending",
  processing: "processing",
  requires_action: "pending",
  pending_verification: "processing",
  succeeded: "success",
  // refund
  requested: "pending",
  approved: "processing",
  completed: "completed",
  rejected: "cancelled",
  // review
  pending: "pending",
  reported: "open",
  // user
  active: "active",
  blocked: "failed",
  locked: "expired",
  // webhook
  received: "pending",
  processed: "success",
  ignored: "inactive",
};

/** Maps any backend enum to an icon + text + tone chip; the label is the humanised value. */
export function StatusChip({ value, label }: { value: string; label?: string }) {
  return <StatusBadge status={STATUS_MAP[value] ?? "inactive"} label={label ?? humanize(value)} />;
}
