import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Frames and voice notes go through here.
 *
 * `local` writes under ./.storage and serves back through /api/media/[...key];
 * it needs no credentials, so the whole product runs on a laptop. `s3` is the
 * same interface against a bucket. Nothing else in the app knows which is in use.
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** A URL the browser can fetch. */
  url(key: string): string;
}

const ROOT = path.join(process.cwd(), ".storage");

function safeJoin(key: string): string {
  // Keys are generated server-side, but never trust one into a path join.
  const clean = key
    .split("/")
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
  if (!clean) throw new Error("empty storage key");
  return path.join(ROOT, clean);
}

const META = ".contenttype";

const localStorage: Storage = {
  async put(key, body, contentType) {
    const file = safeJoin(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    await fs.writeFile(file + META, contentType, "utf8");
  },
  async get(key) {
    const file = safeJoin(key);
    try {
      const body = await fs.readFile(file);
      let contentType = "application/octet-stream";
      try {
        contentType = (await fs.readFile(file + META, "utf8")).trim();
      } catch {
        // fall through to the default
      }
      return { body, contentType };
    } catch {
      return null;
    }
  },
  async delete(key) {
    const file = safeJoin(key);
    await fs.rm(file, { force: true });
    await fs.rm(file + META, { force: true });
  },
  url(key) {
    return `/api/media/${key}`;
  },
};

let s3Impl: Storage | null = null;

function s3Storage(): Storage {
  if (s3Impl) return s3Impl;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    throw new Error(
      "STORAGE_DRIVER=s3 needs AWS_S3_BUCKET and AWS_REGION. Set them, or use STORAGE_DRIVER=local.",
    );
  }

  // Imported lazily so a local-storage deployment never loads the SDK.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
  } = require("@aws-sdk/client-s3");
  /* eslint-enable @typescript-eslint/no-require-imports */

  const client = new S3Client({ region });

  s3Impl = {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        const body = Buffer.from(await res.Body.transformToByteArray());
        return {
          body,
          contentType: res.ContentType ?? "application/octet-stream",
        };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    url(key) {
      // Still proxied: frames are private, and the proxy is where moderation
      // and reveal-time gating are enforced.
      return `/api/media/${key}`;
    },
  };
  return s3Impl;
}

export function storage(): Storage {
  return process.env.STORAGE_DRIVER === "s3" ? s3Storage() : localStorage;
}

export function frameKey(weddingId: string, frameId: string, variant: "orig" | "thumb") {
  return `w/${weddingId}/frames/${frameId}-${variant}.jpg`;
}

export function voiceKey(weddingId: string, noteId: string) {
  return `w/${weddingId}/voice/${noteId}.webm`;
}
