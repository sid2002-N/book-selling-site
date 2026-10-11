import { Armchair, Briefcase, GraduationCap, HeartPulse, Landmark, Laptop, Library, PiggyBank, Sprout, Timer, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  timer: Timer,
  sprout: Sprout,
  briefcase: Briefcase,
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  armchair: Armchair,
  laptop: Laptop,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Library;
  return <Icon className={className} aria-hidden />;
}
