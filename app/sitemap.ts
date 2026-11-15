import type { MetadataRoute } from "next";
import raw from "@/data/investigations.v2.json";

const BASE = "https://japax.vercel.app";
const ROUTES = [
  "",
  "/history",
  "/simulator",
  "/explorer",
  "/dashboard",
  "/safety",
  "/references",
  "/methodology",
  "/glossary",
  "/demo",
  "/ask",
  "/about",
];
// Fixed date: the sitemap is static and only changes when the site is redeployed with new content.
const LAST_MODIFIED = new Date("2026-11-15");

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ROUTES.map((r) => ({ url: `${BASE}${r}`, lastModified: LAST_MODIFIED, priority: r === "" ? 1 : 0.7 }));
  const investigations = raw.investigations.map((i) => ({
    url: `${BASE}/explorer/${i.id}`,
    lastModified: LAST_MODIFIED,
    priority: 0.5,
  }));
  return [...pages, ...investigations];
}
