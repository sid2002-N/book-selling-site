import Image from "next/image";
import { Glow, Motes, Steam } from "@/components/illustration/Atmosphere";

/**
 * The home hero illustration with its motion layer. The frame keeps the artwork's exact 3:2
 * ratio, so the overlays (steam over the mug, light at the window, dust in the sunbeam) stay
 * aligned at every size. Decorative only.
 */
export function HeroScene({ src, className }: { src: string; className?: string }) {
  return (
    <div aria-hidden className={className}>
      <div className="relative aspect-3/2 h-full w-full overflow-hidden motion-safe:animate-hero-settle">
        <Image src={src} alt="" fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
        <Glow at={{ left: "52%", top: "2%", width: "30%", height: "45%" }} />
        <Motes
          points={[
            { left: "62%", top: "18%", delay: "0s", duration: "14s" },
            { left: "70%", top: "30%", delay: "3s", duration: "16s" },
            { left: "58%", top: "38%", delay: "6s", duration: "13s" },
            { left: "75%", top: "14%", delay: "8s", duration: "18s" },
            { left: "66%", top: "46%", delay: "11s", duration: "15s" },
          ]}
        />
        <Steam at={{ left: "90.5%", top: "50%", width: "6.5%", height: "18%" }} />
      </div>
    </div>
  );
}
