/**
 * Motion overlays for painted illustrations (steam, light, dust, flame). Positions are
 * percentages of the artwork, so place them inside a frame that keeps the art's aspect ratio.
 * All decorative; every animation is motion-safe only.
 */
type Box = { left: string; top: string; width: string; height: string };

export function Steam({ at, tone = "light" }: { at: Box; tone?: "light" | "warm" }) {
  const stroke = tone === "light" ? "stroke-surface" : "stroke-accent-soft";
  return (
    <svg viewBox="0 0 40 80" aria-hidden className="pointer-events-none absolute overflow-visible" style={at} fill="none">
      {[
        { d: "M14 78 C 6 64, 22 56, 14 42 C 8 30, 20 22, 14 8", delay: "0s" },
        { d: "M24 78 C 32 66, 18 56, 26 44 C 32 32, 20 24, 26 10", delay: "1.5s" },
        { d: "M19 78 C 13 66, 27 58, 19 46 C 13 36, 25 28, 19 16", delay: "3s" },
      ].map((p) => (
        <path key={p.delay} d={p.d} className={`${stroke} opacity-0 motion-safe:animate-steam`} strokeWidth="3" strokeLinecap="round" style={{ animationDelay: p.delay }} />
      ))}
    </svg>
  );
}

/** Soft breathing light (sun through a window) or a flickering flame. */
export function Glow({ at, kind = "sun" }: { at: Box; kind?: "sun" | "flame" }) {
  return (
    <div
      aria-hidden
      className={
        kind === "sun"
          ? "pointer-events-none absolute rounded-full bg-accent-soft mix-blend-soft-light blur-3xl motion-safe:animate-glow"
          : "pointer-events-none absolute rounded-full bg-accent mix-blend-screen blur-2xl motion-safe:animate-flicker"
      }
      style={at}
    />
  );
}

export function Motes({ points }: { points: { left: string; top: string; delay: string; duration: string }[] }) {
  return (
    <>
      {points.map((m) => (
        <span
          key={m.left + m.top}
          aria-hidden
          className="pointer-events-none absolute size-1 rounded-full bg-surface opacity-0 shadow-1 motion-safe:animate-mote"
          style={{ left: m.left, top: m.top, animationDelay: m.delay, animationDuration: m.duration }}
        />
      ))}
    </>
  );
}
