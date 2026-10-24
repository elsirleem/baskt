import { readFile } from "fs/promises";
import path from "path";
import { LOCAL_UPLOAD_PATH } from "@/lib/images";
import { LOCAL_UPLOAD_DIR } from "@/lib/product-images";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Serves product photos uploaded without Blob storage (see lib/product-images.ts). */
export async function GET(_request: Request, ctx: RouteContext<"/uploads/[file]">) {
  const { file } = await ctx.params;
  // Only names the upload code creates, so nothing outside the folder can be read.
  if (!LOCAL_UPLOAD_PATH.test(`/uploads/${file}`)) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(path.join(LOCAL_UPLOAD_DIR, file));
    return new Response(bytes, {
      headers: {
        "Content-Type": CONTENT_TYPES[file.split(".").pop()!],
        // Names are random and never reused.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
