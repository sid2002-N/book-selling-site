/** Single `bytes=start-end` range (what pdf.js sends). Multi-range and suffix ranges are ignored. */
export function parseRange(header: string | null): { start: number; end?: number } | null {
  const match = header?.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (end !== undefined && end < start) return null;
  return { start, end };
}
