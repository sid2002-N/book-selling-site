import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Bucket, StoragePort, StoredObject } from "./port";

const ROOT = path.resolve(process.cwd(), ".storage");

function resolve(bucket: Bucket, key: string): string {
  const full = path.resolve(ROOT, bucket, key);
  // Keys are generated server-side, but never allow escaping the bucket directory.
  if (!full.startsWith(path.resolve(ROOT, bucket) + path.sep)) throw new Error("Invalid storage key");
  return full;
}

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".zip": "application/zip",
};

/** Development driver: files under ./.storage, public assets served by /media/[...key]. */
export const localStorage: StoragePort = {
  async put(bucket, key, body) {
    const file = resolve(bucket, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  },
  async get(bucket, key, range): Promise<StoredObject | null> {
    const file = resolve(bucket, key);
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) return null;
    const contentType = MIME[path.extname(key).toLowerCase()] ?? "application/octet-stream";
    if (range) {
      const end = Math.min(range.end ?? info.size - 1, info.size - 1);
      return {
        body: createReadStream(file, { start: range.start, end }),
        contentType,
        size: end - range.start + 1,
        range: { start: range.start, end, total: info.size },
      };
    }
    return { body: createReadStream(file), contentType, size: info.size };
  },
  async exists(bucket, key) {
    return Boolean(await stat(resolve(bucket, key)).catch(() => null));
  },
  async delete(bucket, key) {
    await rm(resolve(bucket, key), { force: true });
  },
  publicUrl(key) {
    return `/media/${key}`;
  },
  async signedDownloadUrl() {
    return null;
  },
};
