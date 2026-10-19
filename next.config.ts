import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep in sync with ALLOWED_IMAGE_HOSTS in lib/images.ts (admin form validation).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
