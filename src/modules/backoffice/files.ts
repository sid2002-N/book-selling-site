/**
 * Upload validation (SECURITY §7): file types are decided by magic bytes, never by the
 * client's file name or Content-Type, and every kind has a size cap.
 */
export type SniffedType = "pdf" | "png" | "jpeg" | "webp" | "zip";

export function sniffFileType(bytes: Uint8Array): SniffedType | null {
  const at = (i: number) => bytes[i];
  const ascii = (start: number, text: string) => [...text].every((ch, i) => at(start + i) === ch.charCodeAt(0));
  if (bytes.length >= 5 && ascii(0, "%PDF-")) return "pdf";
  if (bytes.length >= 8 && at(0) === 0x89 && ascii(1, "PNG") && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return "png";
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpeg";
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (bytes.length >= 4 && at(0) === 0x50 && at(1) === 0x4b && at(2) === 0x03 && at(3) === 0x04) return "zip";
  return null;
}

const MB = 1024 * 1024;

export const UPLOAD_RULES = {
  cover: { types: ["png", "jpeg", "webp"] as SniffedType[], maxBytes: 8 * MB, label: "PNG, JPEG or WebP up to 8 MB" },
  preview: { types: ["png", "jpeg", "webp"] as SniffedType[], maxBytes: 8 * MB, label: "PNG, JPEG or WebP up to 8 MB" },
  deliverable: { types: ["pdf", "zip"] as SniffedType[], maxBytes: 90 * MB, label: "PDF or ZIP up to 90 MB" },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;

export type UploadVerdict = { ok: true; type: SniffedType } | { ok: false; reason: string };

export function checkUpload(kind: UploadKind, bytes: Uint8Array): UploadVerdict {
  const rule = UPLOAD_RULES[kind];
  if (bytes.length === 0) return { ok: false, reason: "The file is empty." };
  if (bytes.length > rule.maxBytes) return { ok: false, reason: `The file is too large. Use ${rule.label}.` };
  const type = sniffFileType(bytes);
  if (!type || !rule.types.includes(type)) return { ok: false, reason: `That file type isn't supported here. Use ${rule.label}.` };
  return { ok: true, type };
}

/** Lines of "Title | page" into ToC rows; "Title — description" into What's Inside rows. */
export function parseTocLines(text: string): { title: string; pageNumber: number | null }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 200)
    .map((line) => {
      const m = /^(.*?)\s*\|\s*(\d{1,5})\s*$/.exec(line);
      return m ? { title: m[1]!.slice(0, 200), pageNumber: Number(m[2]) } : { title: line.slice(0, 200), pageNumber: null };
    })
    .filter((r) => r.title.length > 0);
}

export function parseInsideLines(text: string): { title: string; description: string | null }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((line) => {
      const [title, ...rest] = line.split(/\s+[—–-]\s+/);
      const description = rest.join(" — ").trim();
      return { title: (title ?? "").slice(0, 120), description: description ? description.slice(0, 300) : null };
    })
    .filter((r) => r.title.length > 0);
}

/** Integer minor units from a decimal string ("499", "499.50"); null when blank. */
export function parseMajorToMinor(input: string | null | undefined): number | null | "invalid" {
  const s = (input ?? "").trim().replace(/,/g, "");
  if (!s) return null;
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return "invalid";
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function minorToMajorString(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  return frac ? `${whole}.${String(frac).padStart(2, "0")}` : String(whole);
}

/** Suggests the next version label: 1.0 for the first file, otherwise bump the minor part. */
export function nextVersionLabel(existing: string[]): string {
  if (!existing.length) return "1.0";
  const parsed = existing.map((v) => v.split(".").map(Number)).sort((a, b) => (b[0]! - a[0]!) || ((b[1] ?? 0) - (a[1] ?? 0)));
  const [major = 1, minor = 0] = parsed[0]!;
  return `${major}.${minor + 1}`;
}
