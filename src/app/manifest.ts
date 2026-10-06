import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f3ee",
    theme_color: "#f6f3ee",
    lang: "ko",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "기록하기", url: "/write", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "쪽지", url: "/messages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: brand.townName, url: "/town", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
