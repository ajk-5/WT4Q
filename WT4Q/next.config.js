/** @type {import(''next'').NextConfig} */
const nextConfig = {
  // Enable compression for HTML/CSS/JS
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Optional CDN prefix if provided
  assetPrefix: process.env.CDN_URL || undefined,

  images: {
    // Allow Next/Image to optimize remote images and serve AVIF/WebP when possible
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // Tight CSP for on-the-fly optimizer responses
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    dangerouslyAllowSVG: false,
  },

  // Route rewrites
  async rewrites() {
    return [
      { source: "/:indexnowApi.txt", destination: "/api/indexnow/:indexnowApi" },
    ];
  },

  // Strong cache control headers to satisfy PageSpeed "efficient cache policy"
  async headers() {
    return [
      // Build assets: cache hard for a year
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Next/Image optimizer responses (allow daily cache)
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
      // API responses should not be cached by the browser
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      // HTML and all other routes: enable CDN caching with short TTL and SWR
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
          { key: "Vary", value: "Accept-Encoding" },
        ],
      },
    ];
  },

  // Reduce vendor bundle cost for icon library
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;
