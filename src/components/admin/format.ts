import { formatMoney, type Currency } from "@/lib/money";

const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const dateOnly = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Admin timestamps are shown in IST (store timezone, OQ default). */
export const fmtDateTime = (d: Date | string | null | undefined) => (d ? dateTime.format(new Date(d)) : "—");
export const fmtDate = (d: Date | string | null | undefined) => (d ? dateOnly.format(new Date(d)) : "—");
export const fmtMoney = (amountMinor: number, currency: string) => formatMoney({ amountMinor, currency: currency as Currency });

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function humanize(value: string): string {
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
