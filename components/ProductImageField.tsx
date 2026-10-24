"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadProductImage } from "@/lib/actions/admin";
import { isAllowedImageUrl } from "@/lib/images";
import { buttonClass, inputClass } from "@/components/ui";

const MAX_SIDE = 1600; // px; enough for a sharp product page on a high-density screen

/**
 * Redraws the photo at most 1600px on its longest side as a JPEG. Keeps uploads
 * small (phone photos are often 5 MB or more) and drops hidden details like the
 * camera's location.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff"; // JPEG has no transparency; see-through areas would turn black
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode"))), "image/jpeg", 0.85),
  );
}

/**
 * The product photo: upload one from this device, or paste a link. Either way the
 * address ends up in the `imageUrl` field the product form submits.
 */
export function ProductImageField({
  defaultValue,
  onUploadingChange,
}: {
  defaultValue?: string;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string>();
  const [uploading, startUpload] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    setError(undefined);
    onUploadingChange(true);
    startUpload(async () => {
      try {
        const formData = new FormData();
        formData.append("file", await shrink(file), "photo.jpg");
        const result = await uploadProductImage(formData);
        if ("url" in result) setUrl(result.url);
        else setError(result.error);
      } catch {
        setError("Couldn't read that photo. Use a JPEG, PNG or WebP file.");
      } finally {
        onUploadingChange(false);
      }
    });
  }

  const preview = isAllowedImageUrl(url) ? url : null;

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink-mid">Product photo</span>
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-line bg-cream text-2xl">
          {preview ? (
            <Image src={preview} alt="Product photo preview" fill sizes="96px" unoptimized className="object-cover" />
          ) : (
            <span aria-hidden>📷</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Photo to upload"
            tabIndex={-1}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // so choosing the same file again still uploads
              if (file) upload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className={buttonClass.outline}
          >
            {uploading ? "Uploading…" : preview ? "Replace photo" : "Upload a photo"}
          </button>
          <p className="mt-1.5 text-xs text-ink-soft">
            JPEG, PNG or WebP from your computer or phone. Large photos are resized.
          </p>
        </div>
      </div>

      <label htmlFor="imageUrl" className="mb-1.5 mt-3 block text-xs font-medium text-ink-soft">
        Or paste an image link from images.unsplash.com
      </label>
      <input
        id="imageUrl"
        name="imageUrl"
        type="text"
        inputMode="url"
        required
        // Same rule as isAllowedImageUrl, so the browser catches a bad link straight away.
        pattern="https://images\.unsplash\.com/.+|https://[a-z0-9]+\.public\.blob\.vercel-storage\.com/.+|/uploads/[0-9a-f]{24}\.(jpg|png|webp)"
        title="Upload a photo, or use an image link from images.unsplash.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://images.unsplash.com/..."
        className={inputClass}
      />
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
