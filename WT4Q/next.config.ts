import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure gzip/brotli for HTML/CSS/JS
  compress: true,
  poweredByHeader: false,
  assetPrefix: process.env.CDN_URL || undefined,

  images: {
    // Ideally list real hosts; wildcard ok during development
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    return [
      {
        source: "/:indexnowApi.txt",
        destination: "/api/indexnow/:indexnowApi",
      },
    ];
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
      // API responses: never cached by browser
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // HTML & everything else: allow CDN cache, vary by encoding
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
          { key: "Vary", value: "Accept-Encoding" },
        ],
      },
    ];
  },
};

export default nextConfig;

