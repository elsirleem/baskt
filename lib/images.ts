/**
 * Sites product images may come from: Unsplash links, and photos uploaded to Vercel
 * Blob. Keep in sync with `images.remotePatterns` and the CSP's img-src in
 * next.config.ts (the Docker image loads that config without the rest of the source,
 * so it can't import this list).
 */
export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com", "*.public.blob.vercel-storage.com"];

/** Photos uploaded without Blob storage, served from this server by app/uploads/[file]. */
export const LOCAL_UPLOAD_PATH = /^\/uploads\/[0-9a-f]{24}\.(?:jpg|png|webp)$/;

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_IMAGE_HOSTS.some((allowed) =>
    allowed.startsWith("*.")
      ? hostname.endsWith(allowed.slice(1)) && hostname.length > allowed.length - 1
      : hostname === allowed,
  );
}

/** True for https links on an allowed image host, or an uploaded photo; anything else breaks next/image. */
export function isAllowedImageUrl(url: string): boolean {
  if (LOCAL_UPLOAD_PATH.test(url)) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && isAllowedHost(hostname);
  } catch {
    return false;
  }
}

/**
 * The image as a full https address other sites can load (Stripe's checkout page),
 * or undefined for a photo stored on a server they can't reach, e.g. localhost.
 */
export function publicImageUrl(url: string, siteUrl: string): string | undefined {
  const absolute = new URL(url, siteUrl);
  return absolute.protocol === "https:" ? absolute.toString() : undefined;
}
