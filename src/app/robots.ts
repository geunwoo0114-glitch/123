import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/settings", "/notifications", "/friends", "/messages", "/admin", "/write", "/onboarding", "/town", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
