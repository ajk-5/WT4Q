import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  assetPrefix: process.env.CDN_URL || undefined,

  images: {
    // ⚠️ Ideally list real hosts; wildcard is ok while developing
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      // Build assets: cache hard for a year
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Next/Image optimizer responses (safe daily cache)
      {
        source: "/_next/image",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, must-revalidate" }],
      },
      // API responses: never cached by browser (prevents “infinite” revalidation)
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // HTML & everything else: don’t cache in browser
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
