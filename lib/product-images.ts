import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { configuredEnv } from "@/lib/env";

/** Larger photos are shrunk in the browser before upload, so this is rarely reached. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
type ImageType = keyof typeof EXTENSIONS;

/**
 * The image type from the file's first bytes. The type a browser reports comes
 * from the file name, so it can't be trusted.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Without Blob storage, uploads are saved here and served by app/uploads/[file]. */
export const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

/** Vercel adds these when a Blob store is connected to the project. */
function blobConfigured(): boolean {
  return Boolean(configuredEnv(process.env.BLOB_READ_WRITE_TOKEN) || process.env.BLOB_STORE_ID);
}

export type StoredImage = { url: string } | { error: string };

/**
 * Saves a product photo and returns its address: in Vercel Blob when connected,
 * otherwise on this server's disk (fine for local development; on Vercel the disk
 * doesn't keep files, so uploads need Blob there).
 */
export async function storeProductImage(file: File): Promise<StoredImage> {
  if (file.size === 0) return { error: "Choose a photo to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "That photo is over 4 MB. Try a smaller one." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { error: "Use a JPEG, PNG or WebP photo." };
  const name = `${randomBytes(12).toString("hex")}.${EXTENSIONS[type]}`;

  if (blobConfigured()) {
    const blob = await put(`products/${name}`, Buffer.from(bytes), {
      access: "public",
      contentType: type,
      // Names are random and never reused, so browsers can keep them for a year.
      cacheControlMaxAge: 365 * 24 * 60 * 60,
    });
    return { url: blob.url };
  }

  if (process.env.VERCEL) {
    return {
      error:
        "Photo uploads aren't set up yet: connect a Blob store to this project in Vercel (Storage). Pasting an image link still works.",
    };
  }

  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), bytes);
  return { url: `/uploads/${name}` };
}
