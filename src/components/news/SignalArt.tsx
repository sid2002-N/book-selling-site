/**
 * Hero motion graphic: an open book broadcasting to a constellation of ideas. Lines draw
 * themselves, nodes breathe, the book floats. Pure SVG + CSS, coloured by theme tokens.
 */
const PATHS = [
  "M210 170 C 250 140, 290 120, 345 82",
  "M210 170 C 260 175, 300 190, 360 210",
  "M210 170 C 180 130, 150 105, 95 70",
  "M210 170 C 160 190, 120 215, 70 240",
  "M210 170 C 215 220, 230 255, 250 292",
  "M345 82 C 370 120, 372 165, 360 210",
  "M95 70 C 140 40, 220 32, 290 48",
];
const NODES: { cx: number; cy: number; r: number; tone: string; delay: number }[] = [
  { cx: 345, cy: 82, r: 9, tone: "fill-accent", delay: 0 },
  { cx: 360, cy: 210, r: 7, tone: "fill-plum", delay: 0.6 },
  { cx: 95, cy: 70, r: 8, tone: "fill-terracotta", delay: 1.1 },
  { cx: 70, cy: 240, r: 6, tone: "fill-accent", delay: 1.6 },
  { cx: 250, cy: 292, r: 7, tone: "fill-plum", delay: 0.9 },
  { cx: 290, cy: 48, r: 5, tone: "fill-terracotta", delay: 2.1 },
];

export function SignalArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 320" role="img" aria-label="An open book sending signals to a network of ideas" className={className}>
      {/* Faint orbit rings */}
      <g className="fill-none stroke-line" strokeWidth="1">
        <circle cx="210" cy="170" r="70" />
        <circle cx="210" cy="170" r="125" strokeDasharray="2 6" />
      </g>
      {/* Connections that draw in */}
      <g className="fill-none stroke-line-strong" strokeWidth="1.5" strokeLinecap="round">
        {PATHS.map((d, i) => (
          <path key={d} d={d} pathLength={1} className="draw-path" style={{ animationDelay: `${0.25 + i * 0.18}s` }} />
        ))}
      </g>
      {/* Breathing nodes with soft halos */}
      {NODES.map((n) => (
        <g key={`${n.cx}-${n.cy}`} style={{ transformOrigin: `${n.cx}px ${n.cy}px`, animationDelay: `${n.delay}s` }} className="motion-safe:animate-node">
          <circle cx={n.cx} cy={n.cy} r={n.r * 2.2} className={`${n.tone} opacity-15`} />
          <circle cx={n.cx} cy={n.cy} r={n.r} className={n.tone} />
        </g>
      ))}
      {/* The open book, floating */}
      <g className="motion-safe:animate-float">
        <path d="M210 150 C 190 138, 165 136, 146 142 L 146 200 C 165 194, 190 196, 210 208 Z" className="fill-surface stroke-ink" strokeWidth="2" strokeLinejoin="round" />
        <path d="M210 150 C 230 138, 255 136, 274 142 L 274 200 C 255 194, 230 196, 210 208 Z" className="fill-surface stroke-ink" strokeWidth="2" strokeLinejoin="round" />
        <path d="M210 150 L 210 208" className="stroke-ink" strokeWidth="2" />
        <g className="stroke-line-strong" strokeWidth="1.5" strokeLinecap="round">
          <path d="M158 156 L 198 160" />
          <path d="M158 168 L 198 172" />
          <path d="M158 180 L 190 183" />
          <path d="M222 160 L 262 156" />
          <path d="M222 172 L 262 168" />
          <path d="M222 184 L 254 181" />
        </g>
      </g>
    </svg>
  );
}
