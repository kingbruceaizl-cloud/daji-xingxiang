import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const privateIndexingHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const privateCacheHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, max-age=0",
  },
];

const privateResponseHeaders = [
  ...privateIndexingHeaders,
  ...privateCacheHeaders,
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: privateResponseHeaders,
      },
      {
        source: "/protected/:path*",
        headers: privateResponseHeaders,
      },
      {
        source: "/api/:path*",
        headers: privateResponseHeaders,
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
};

export default nextConfig;
