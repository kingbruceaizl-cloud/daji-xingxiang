import type { MetadataRoute } from "next";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/projects", "/projects/new", "/studio/demo", "/auth/login"],
        disallow: ["/admin", "/protected", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
