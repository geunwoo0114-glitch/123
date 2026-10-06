import type { MetadataRoute } from "next";
import { appUrl } from "@/config/app";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/settings", "/notifications", "/friends", "/messages", "/admin", "/write", "/onboarding", "/town", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
