import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

let dir: string;

/** Loads the module fresh, since it reads UPLOAD_DIR when it's first imported. */
async function load() {
  vi.resetModules();
  return import("@/lib/product-images");
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "afropantry-uploads-"));
  vi.stubEnv("UPLOAD_DIR", dir);
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
  vi.stubEnv("BLOB_STORE_ID", "");
  vi.stubEnv("VERCEL", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("sniffImageType reads the file, not its name", () => {
  test.each([
    ["PNG", PNG, "image/png"],
    ["JPEG", JPEG, "image/jpeg"],
    ["WebP", WEBP, "image/webp"],
  ])("%s", async (_label, bytes, type) => {
    const { sniffImageType } = await load();
    expect(sniffImageType(bytes)).toBe(type);
  });

  test.each([
    ["an SVG (can carry scripts)", new TextEncoder().encode("<svg xmlns=...>")],
    ["a GIF", new TextEncoder().encode("GIF89a")],
    ["text", new TextEncoder().encode("hello")],
  ])("rejects %s", async (_label, bytes) => {
    const { sniffImageType } = await load();
    expect(sniffImageType(bytes)).toBeNull();
  });
});

describe("storeProductImage without Blob storage", () => {
  test("saves to the upload folder under a random name", async () => {
    const { storeProductImage } = await load();
    const result = await storeProductImage(new File([PNG], "../../evil.svg", { type: "image/svg+xml" }));

    expect(result).toEqual({ url: expect.stringMatching(/^\/uploads\/[0-9a-f]{24}\.png$/) });
    const name = path.basename((result as { url: string }).url);
    expect(new Uint8Array(await readFile(path.join(dir, name)))).toEqual(PNG);
  });

  test("refuses files that aren't JPEG, PNG or WebP", async () => {
    const { storeProductImage } = await load();
    expect(await storeProductImage(new File(["<svg/>"], "photo.png", { type: "image/png" }))).toEqual({
      error: "Use a JPEG, PNG or WebP photo.",
    });
  });

  test("refuses files over 4 MB", async () => {
    const { storeProductImage, MAX_IMAGE_BYTES } = await load();
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(JPEG);
    expect(await storeProductImage(new File([big], "big.jpg"))).toEqual({
      error: "That photo is over 4 MB. Try a smaller one.",
    });
  });

  test("on Vercel it explains that a Blob store is needed", async () => {
    vi.stubEnv("VERCEL", "1");
    const { storeProductImage } = await load();
    const result = await storeProductImage(new File([PNG], "photo.png"));
    expect(result).toEqual({ error: expect.stringContaining("connect a Blob store") });
  });
});
