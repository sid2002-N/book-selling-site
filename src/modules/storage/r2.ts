import "server-only";
import { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Bucket, StoragePort } from "./port";

let client: S3Client | null = null;
function s3(): S3Client {
  client ??= new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}

function bucketName(bucket: Bucket): string {
  const name = bucket === "public" ? process.env.STORAGE_BUCKET_PUBLIC : process.env.STORAGE_BUCKET_PRIVATE;
  if (!name) throw new Error(`Storage bucket for "${bucket}" is not configured`);
  return name;
}

/** Cloudflare R2 driver (S3 API). Private objects are only reachable through presigned URLs. */
export const r2Storage: StoragePort = {
  async put(bucket, key, body, contentType) {
    await s3().send(new PutObjectCommand({ Bucket: bucketName(bucket), Key: key, Body: body, ContentType: contentType }));
  },
  async get(bucket, key, range) {
    try {
      const res = await s3().send(
        new GetObjectCommand({
          Bucket: bucketName(bucket),
          Key: key,
          ...(range ? { Range: `bytes=${range.start}-${range.end ?? ""}` } : {}),
        }),
      );
      if (!res.Body) return null;
      const body = res.Body instanceof Readable ? res.Body : Readable.fromWeb(res.Body.transformToWebStream() as never);
      const size = res.ContentLength ?? 0;
      const total = res.ContentRange ? Number(res.ContentRange.split("/")[1]) : size;
      return {
        body,
        contentType: res.ContentType ?? "application/octet-stream",
        size,
        ...(range ? { range: { start: range.start, end: range.start + size - 1, total } } : {}),
      };
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null;
      throw error;
    }
  },
  async exists(bucket, key) {
    try {
      await s3().send(new HeadObjectCommand({ Bucket: bucketName(bucket), Key: key }));
      return true;
    } catch {
      return false;
    }
  },
  async delete(bucket, key) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
  },
  publicUrl(key) {
    const base = process.env.CDN_BASE_URL;
    if (!base) throw new Error("CDN_BASE_URL is not configured");
    return `${base.replace(/\/$/, "")}/${key}`;
  },
  async signedDownloadUrl(key, { ttlSeconds, fileName }) {
    const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
    return getSignedUrl(
      s3(),
      new GetObjectCommand({
        Bucket: bucketName("private"),
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
        ResponseCacheControl: "private, no-store",
      }),
      { expiresIn: ttlSeconds },
    );
  },
};
