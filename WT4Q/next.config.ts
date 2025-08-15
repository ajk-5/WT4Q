
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // If you serve _next/static from a CDN
  assetPrefix: process.env.CDN_URL || undefined,

  // ✅ Allow remote images for <Image />
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        pathname: "/**",
      },
      // { protocol: "https", hostname: "cdn.yoursite.com", pathname: "/**" },
      // { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      // Long cache for build assets
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, immutable",
          },
        ],
      },
      // Default cache for app routes
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
