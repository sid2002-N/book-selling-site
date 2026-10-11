import type { Readable } from "node:stream";

export type Bucket = "public" | "private";

export type StoredObject = {
  body: Readable;
  contentType: string;
  size: number;
  /** Present for range requests. */
  range?: { start: number; end: number; total: number };
};

/** StoragePort (ARCHITECTURE §5): binary assets only; the DB keeps keys and metadata. */
export interface StoragePort {
  put(bucket: Bucket, key: string, body: Buffer, contentType: string): Promise<void>;
  get(bucket: Bucket, key: string, range?: { start: number; end?: number }): Promise<StoredObject | null>;
  exists(bucket: Bucket, key: string): Promise<boolean>;
  delete(bucket: Bucket, key: string): Promise<void>;
  /** Public assets only (covers, previews). */
  publicUrl(key: string): string;
  /**
   * Short-lived download URL for private objects. Returns null when the driver streams
   * through the app instead (local driver), in which case callers use the protected route.
   */
  signedDownloadUrl(key: string, options: { ttlSeconds: number; fileName: string }): Promise<string | null>;
}
