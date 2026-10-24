import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Browser security policy, set as plain headers (no nonces) so pages can still be
// cached later. Blocks scripts and plugins from other sites, embedding the shop
// in other sites (clickjacking), and sending data anywhere but this site.
// Dev needs 'unsafe-eval' and websockets for React debugging and hot reload.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://images.unsplash.com https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Browsers only honour this over HTTPS, so it's harmless on http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Keep in sync with ALLOWED_IMAGE_HOSTS in lib/images.ts (admin form validation).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Photos uploaded in the admin product form (lib/product-images.ts).
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    // Uploaded product photos go through a Server Action. They're shrunk in the
    // browser first, and Vercel caps request bodies at 4.5 MB anyway.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
