import { RefreshCw } from "lucide-react";
import { Fragment } from "react";
import { SignalArt } from "./SignalArt";

/** Page hero: live indicator, word-by-word headline rise, and the signal motion graphic. */
export function NewsHero({ updatedLabel, sourceCount }: { updatedLabel: string; sourceCount: number }) {
  const words = ["Tech", "&", "Culture"];
  return (
    <header className="relative overflow-hidden bg-linear-to-b from-canvas-subtle to-canvas">
      <div className="container-page grid items-center gap-8 pt-8 pb-10 md:pt-12 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="flex items-center gap-2 text-micro font-semibold tracking-widest text-accent-strong uppercase">
            <span className="relative flex size-2">
              <span aria-hidden className="absolute inline-flex size-full rounded-full bg-terracotta motion-safe:animate-ping-soft" />
              <span className="relative inline-flex size-2 rounded-full bg-terracotta" />
            </span>
            Live from {sourceCount} sources
          </p>
          <h1 className="text-display text-fg">
            {words.map((w, i) => (
              <Fragment key={w}>
                <span className="inline-block motion-safe:animate-word-rise" style={{ animationDelay: `${i * 120}ms` }}>
                  {w === "&" ? <span className="text-terracotta">{w}</span> : w}
                </span>
                {i < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="max-w-xl text-body-lg text-fg-secondary motion-safe:animate-word-rise" style={{ animationDelay: "380ms" }}>
            The ideas shaping how we learn, work and create — gathered from trusted publishers and refreshed through the day.
          </p>
          <p className="flex items-center gap-2 text-caption text-fg-muted motion-safe:animate-word-rise" style={{ animationDelay: "500ms" }}>
            <RefreshCw className="size-3.5" aria-hidden /> {updatedLabel}
          </p>
        </div>
        <div className="mx-auto w-full max-w-md lg:max-w-lg">
          <SignalArt className="h-auto w-full" />
        </div>
      </div>
    </header>
  );
}
