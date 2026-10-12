import { fmtDate, fmtMoney } from "./format";

/**
 * Daily revenue bars (server-rendered SVG, warm chart palette). Values are real paid-order
 * totals; zero days stay visible so the trend is never smoothed or invented.
 */
export function RevenueChart({ series, currency }: { series: { day: string; amountMinor: number }[]; currency: "INR" | "USD" }) {
  const max = Math.max(...series.map((s) => s.amountMinor), 0);
  const total = series.reduce((n, s) => n + s.amountMinor, 0);
  const w = 600;
  const h = 160;
  const gap = 2;
  const bar = w / series.length - gap;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" role="img" aria-label={`Daily ${currency} revenue, ${series.length} days, total ${fmtMoney(total, currency)}`} preserveAspectRatio="none">
        <line x1="0" x2={w} y1={h - 0.5} y2={h - 0.5} className="stroke-line" strokeWidth="1" />
        {series.map((s, i) => {
          const height = max ? Math.max(s.amountMinor > 0 ? 3 : 0, (s.amountMinor / max) * (h - 8)) : 0;
          return (
            <rect key={s.day} x={i * (bar + gap)} y={h - height} width={bar} height={height} rx="2" className={currency === "INR" ? "fill-chart-1" : "fill-chart-3"}>
              <title>{`${fmtDate(s.day)}: ${fmtMoney(s.amountMinor, currency)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="flex justify-between text-caption text-fg-muted">
        <span>{fmtDate(series[0]?.day)}</span>
        <span>{max === 0 ? "No paid orders in this period" : `Peak day ${fmtMoney(max, currency)}`}</span>
        <span>{fmtDate(series.at(-1)?.day)}</span>
      </figcaption>
    </figure>
  );
}
