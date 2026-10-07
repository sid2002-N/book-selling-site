import "server-only";
import { randomBytes } from "node:crypto";
import { localStorage } from "./local";
import type { StoragePort } from "./port";
import { r2Storage } from "./r2";

export type { Bucket, StoragePort, StoredObject } from "./port";

export function storage(): StoragePort {
  if (process.env.STORAGE_DRIVER === "r2") return r2Storage;
  if (process.env.APP_ENV === "production") throw new Error("Production requires STORAGE_DRIVER=r2");
  return localStorage;
}

/** Random, non-guessable object key (SECURITY §7–8). Never derived from user file names. */
export function newObjectKey(prefix: string, extension: string): string {
  return `${prefix}/${randomBytes(16).toString("hex")}.${extension.replace(/^\./, "")}`;
}
