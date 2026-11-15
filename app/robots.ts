import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dev-label"] },
    sitemap: "https://japax.vercel.app/sitemap.xml",
  };
}
