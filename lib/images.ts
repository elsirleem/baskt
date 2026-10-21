/**
 * Sites product images may be linked from. Keep in sync with `images.remotePatterns`
 * in next.config.ts (the Docker image loads that config without the rest of the
 * source, so it can't import this list).
 */
export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com"];

/** True for https links on an allowed image host; anything else breaks next/image. */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
