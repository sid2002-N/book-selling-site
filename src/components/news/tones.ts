/** Each source gets a stable colour from the warm chart palette (no new colours). */
const TONES = [
  { bar: "bg-chart-1", text: "text-chart-1", ring: "ring-chart-1" },
  { bar: "bg-chart-3", text: "text-chart-3", ring: "ring-chart-3" },
  { bar: "bg-chart-7", text: "text-chart-7", ring: "ring-chart-7" },
  { bar: "bg-chart-2", text: "text-chart-2", ring: "ring-chart-2" },
  { bar: "bg-chart-4", text: "text-chart-4", ring: "ring-chart-4" },
  { bar: "bg-chart-6", text: "text-chart-6", ring: "ring-chart-6" },
];

export type Tone = (typeof TONES)[number];

export function toneFor(sourceIds: string[], id: string): Tone {
  const i = Math.max(0, sourceIds.indexOf(id));
  return TONES[i % TONES.length]!;
}
